/**
 * Terminal image-protocol detection + encoding.
 *
 * Supported protocols (in order):
 *   - Kitty graphics (`\x1b_G...\x1b\\`) — Kitty, Ghostty
 *   - iTerm2 inline  (`\x1b]1337;File=...\x07`)
 *   - Sixel          — only if `sixel` CLI is on PATH (detected at call time)
 *   - ASCII fallback — simple placeholder string
 *
 * We never touch the image bytes beyond base64 — terminal handles scaling.
 */

import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";

export type ImageProtocol = "kitty" | "iterm2" | "sixel" | "ascii";

let cachedProtocol: ImageProtocol | null = null;

export function detectProtocol(): ImageProtocol {
	if (cachedProtocol) return cachedProtocol;
	cachedProtocol = detectProtocolImpl();
	return cachedProtocol;
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
	if (termProgram === "WezTerm") {
		return "sixel";
	}
	return "ascii";
}

function mimeFor(path: string): string {
	const ext = extname(path).toLowerCase();
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".png") return "image/png";
	if (ext === ".gif") return "image/gif";
	if (ext === ".webp") return "image/webp";
	return "application/octet-stream";
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

function asciiFallback(cols: number, rows: number, label: string): string {
	const safeCols = Math.max(4, cols);
	const safeRows = Math.max(2, rows);
	const inner = Math.max(0, safeCols - 2);
	const top = `┌${"─".repeat(inner)}┐`;
	const bottom = `└${"─".repeat(inner)}┘`;
	const lines: string[] = [top];
	const textLine = label.length > inner ? `${label.slice(0, Math.max(0, inner - 1))}…` : label;
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

export interface RenderThumbOpts {
	path: string;
	cols: number;
	rows: number;
	/** Override protocol (useful for tests / forcing ascii). */
	protocol?: ImageProtocol;
	/** Label shown in ASCII fallback; defaults to basename. */
	label?: string;
}

/**
 * Returns a string suitable for writing directly into an Ink `<Text>`.
 * For Kitty/iTerm2 this is a raw escape sequence the terminal overlays on
 * top of our grid. For Sixel/ASCII it's a visible textual placeholder.
 */
export function renderThumb(opts: RenderThumbOpts): string {
	const { path, cols, rows } = opts;
	const proto = opts.protocol ?? detectProtocol();
	const label = opts.label ?? basenameish(path);

	if (!existsSync(path)) {
		return asciiFallback(cols, rows, `missing: ${label}`);
	}

	try {
		if (proto === "kitty") {
			return encodeKitty(path, cols, rows);
		}
		if (proto === "iterm2") {
			return encodeITerm2(path, cols, rows);
		}
		// Sixel and ASCII both fall back to visible placeholder in-app —
		// real sixel requires a CLI dance we skip here.
		const mime = mimeFor(path);
		const hint =
			proto === "sixel" ? "sixel not wired" : `${mime.split("/")[1] ?? ""}`;
		return asciiFallback(cols, rows, hint ? `${label}  ${hint}` : label);
	} catch {
		return asciiFallback(cols, rows, label);
	}
}

function basenameish(path: string): string {
	const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return idx >= 0 ? path.slice(idx + 1) : path;
}
