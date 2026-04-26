/**
 * Terminal image-protocol detection + encoding.
 *
 * Precedence (highest to lowest, picks the first that fits the host terminal):
 *   - Kitty graphics (`\x1b_G...\x1b\\`)             — Kitty, Ghostty
 *   - iTerm2 inline  (`\x1b]1337;File=...\x07`)      — iTerm.app
 *   - chafa --format=sixel                            — WezTerm, foot, mlterm,
 *                                                      mintty, Black Box
 *   - chafa --format=symbols                          — anywhere chafa is installed;
 *                                                      block+border+space symbols
 *                                                      look much closer to real
 *                                                      pixels than half-block
 *   - ANSI half-block via `terminal-image`            — last-resort fallback
 *
 * Native protocols are produced synchronously (just base64). chafa + the
 * half-block path are async because they decode + downscale the image;
 * callers receive `Promise<string>` uniformly.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";
import terminalImage from "terminal-image";

export type ImageProtocol =
	| "kitty"
	| "iterm2"
	| "chafa-sixel"
	| "chafa-symbols"
	| "ascii";

let cachedProtocol: ImageProtocol | null = null;
let cachedChafa: string | null | undefined; // undefined = not probed

function probeChafa(): string | null {
	if (cachedChafa !== undefined) return cachedChafa;
	try {
		const r = spawnSync("which", ["chafa"], { encoding: "utf8" });
		if (r.status === 0 && r.stdout.trim()) {
			cachedChafa = r.stdout.trim();
		} else {
			cachedChafa = null;
		}
	} catch {
		cachedChafa = null;
	}
	return cachedChafa;
}

function terminalSupportsSixel(): boolean {
	const env = process.env;
	const term = env.TERM ?? "";
	const termProgram = env.TERM_PROGRAM ?? "";
	return (
		termProgram === "WezTerm" ||
		term === "foot" ||
		term === "mlterm" ||
		term === "mintty" ||
		/sixel/i.test(term)
	);
}

export function detectProtocol(): ImageProtocol {
	if (cachedProtocol) return cachedProtocol;
	cachedProtocol = detectProtocolImpl();
	return cachedProtocol;
}

/** Test hook — clears the cached protocol detection. */
export function __resetProtocolCache(): void {
	cachedProtocol = null;
	cachedChafa = undefined;
}

function detectProtocolImpl(): ImageProtocol {
	const env = process.env;
	const term = env.TERM ?? "";
	const termProgram = env.TERM_PROGRAM ?? "";

	if (env.KITTY_WINDOW_ID || /kitty/i.test(term) || termProgram === "ghostty") {
		return "kitty";
	}
	if (termProgram === "iTerm.app" || env.LC_TERMINAL === "iTerm2") {
		return "iterm2";
	}
	if (probeChafa()) {
		return terminalSupportsSixel() ? "chafa-sixel" : "chafa-symbols";
	}
	return "ascii";
}

/** Encodes a file as a Kitty graphics protocol escape, chunked. */
function encodeKitty(path: string, cols: number, rows: number): string {
	const bytes = readFileSync(path);
	const b64 = bytes.toString("base64");
	const CHUNK = 4096;
	if (b64.length <= CHUNK) {
		return `\x1b_Ga=T,f=100,c=${cols},r=${rows};${b64}\x1b\\`;
	}
	let out = "";
	for (let i = 0; i < b64.length; i += CHUNK) {
		const slice = b64.slice(i, i + CHUNK);
		const more = i + CHUNK < b64.length ? 1 : 0;
		const head =
			i === 0
				? `a=T,f=100,c=${cols},r=${rows},m=${more}`
				: `m=${more}`;
		out += `\x1b_G${head};${slice}\x1b\\`;
	}
	return out;
}

function encodeITerm2(path: string, cols: number, rows: number): string {
	const bytes = readFileSync(path);
	const b64 = bytes.toString("base64");
	const name = Buffer.from(path).toString("base64");
	const parts = [
		`name=${name}`,
		"inline=1",
		`width=${cols}`,
		`height=${rows}`,
		"preserveAspectRatio=1",
	].join(";");
	return `\x1b]1337;File=${parts}:${b64}\x07`;
}

function placeholder(cols: number, rows: number, label: string): string {
	const safeCols = Math.max(4, cols);
	const safeRows = Math.max(2, rows);
	const inner = Math.max(0, safeCols - 2);
	const top = `┌${"─".repeat(inner)}┐`;
	const bottom = `└${"─".repeat(inner)}┘`;
	const lines: string[] = [top];
	const textLine =
		label.length > inner
			? `${label.slice(0, Math.max(0, inner - 1))}…`
			: label;
	const pad = Math.max(0, inner - textLine.length);
	for (let i = 0; i < safeRows - 2; i++) {
		if (i === Math.floor((safeRows - 2) / 2)) {
			lines.push(`│${textLine}${" ".repeat(pad)}│`);
		} else {
			lines.push(`│${" ".repeat(inner)}│`);
		}
	}
	lines.push(bottom);
	return lines.join("\n");
}

async function renderHalfBlock(
	path: string,
	cols: number,
	rows: number,
): Promise<string> {
	// terminal-image renders 2 px per terminal row using ▀ / ▄, so request 2x rows.
	const out = await terminalImage.file(path, {
		width: cols,
		height: rows * 2,
		preserveAspectRatio: true,
		preferNativeRender: false,
	});
	// terminal-image trails a newline; strip it so layout doesn't gain a row.
	return out.endsWith("\n") ? out.slice(0, -1) : out;
}

function renderChafa(
	path: string,
	cols: number,
	rows: number,
	format: "sixel" | "symbols",
): string | null {
	const chafa = probeChafa();
	if (!chafa) return null;
	const args = [
		"--size",
		`${cols}x${rows}`,
		"--format",
		format,
		"--animate",
		"off",
	];
	if (format === "symbols") {
		args.push("--symbols", "block+border+space");
	}
	args.push(path);
	const r = spawnSync(chafa, args, { encoding: "utf8" });
	if (r.status !== 0 || !r.stdout) return null;
	const out = r.stdout;
	return out.endsWith("\n") ? out.slice(0, -1) : out;
}

export interface RenderThumbOpts {
	path: string;
	cols: number;
	rows: number;
	/** Override protocol (useful for tests / forcing ascii). */
	protocol?: ImageProtocol;
	/** Label shown when the file is missing or rendering fails. */
	label?: string;
}

/**
 * Returns a string suitable for writing directly into an Ink `<Text>`.
 * For Kitty/iTerm2 this is a raw escape sequence the terminal overlays on
 * top of our grid. For Sixel/ASCII we render an ANSI half-block thumbnail.
 */
export async function renderThumb(opts: RenderThumbOpts): Promise<string> {
	const { path, cols, rows } = opts;
	const proto = opts.protocol ?? detectProtocol();
	const label = opts.label ?? basenameish(path);

	if (!existsSync(path)) {
		return placeholder(cols, rows, `missing: ${label}`);
	}

	try {
		if (proto === "kitty") return encodeKitty(path, cols, rows);
		if (proto === "iterm2") return encodeITerm2(path, cols, rows);
		if (proto === "chafa-sixel") {
			const rendered = renderChafa(path, cols, rows, "sixel");
			if (rendered !== null) return rendered;
			// chafa unexpectedly failed — fall through to half-block
		}
		if (proto === "chafa-symbols") {
			const rendered = renderChafa(path, cols, rows, "symbols");
			if (rendered !== null) return rendered;
		}
		return await renderHalfBlock(path, cols, rows);
	} catch {
		return placeholder(cols, rows, label);
	}
}

function basenameish(path: string): string {
	const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return idx >= 0 ? path.slice(idx + 1) : path;
}

/** Mime helper used by external code (kept exported for backwards-compat). */
export function mimeFor(path: string): string {
	const ext = extname(path).toLowerCase();
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".png") return "image/png";
	if (ext === ".gif") return "image/gif";
	if (ext === ".webp") return "image/webp";
	return "application/octet-stream";
}
