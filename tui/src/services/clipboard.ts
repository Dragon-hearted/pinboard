/**
 * Cross-platform clipboard probe — best-effort wrapper around the OS binaries
 * already present on every dev machine in this codebase. Returns text or
 * image bytes. Never throws — missing binaries fall through to null.
 */

import { spawnSync } from "node:child_process";

/** Read text from the system clipboard, or null if no text is available. */
export function pasteText(): string | null {
	if (process.platform === "darwin") {
		const r = spawnSync("pbpaste", [], { encoding: "utf8" });
		if (r.status === 0 && r.stdout) return r.stdout;
		return null;
	}
	if (process.platform === "linux") {
		const wl = spawnSync("wl-paste", [], { encoding: "utf8" });
		if (wl.status === 0 && wl.stdout) return wl.stdout;
		const xc = spawnSync("xclip", ["-selection", "clipboard", "-o"], {
			encoding: "utf8",
		});
		if (xc.status === 0 && xc.stdout) return xc.stdout;
	}
	return null;
}

/**
 * Read image bytes from the clipboard if it contains a PNG. Used so users can
 * Cmd+V a screenshot directly into the AddFileModal. Returns null on any
 * platform where this is not available.
 */
export function pasteImagePng(): Buffer | null {
	if (process.platform === "darwin") {
		const r = spawnSync("pbpaste", ["-Prefer", "image/png"], {
			encoding: "buffer",
		});
		if (r.status === 0 && r.stdout && r.stdout.length > 0) return r.stdout;
	}
	if (process.platform === "linux") {
		const wl = spawnSync("wl-paste", ["--type", "image/png"], {
			encoding: "buffer",
		});
		if (wl.status === 0 && wl.stdout && wl.stdout.length > 0) return wl.stdout;
		const xc = spawnSync(
			"xclip",
			["-selection", "clipboard", "-t", "image/png", "-o"],
			{ encoding: "buffer" },
		);
		if (xc.status === 0 && xc.stdout && xc.stdout.length > 0) return xc.stdout;
	}
	return null;
}

/**
 * Split a paste blob into individual file paths. Handles:
 *   - newline-separated lists (Finder multi-drop pastes one path per line)
 *   - whitespace-separated single line (terminal-drag puts a path per token)
 *   - leading `file://` URI prefix
 *   - shell-escaped spaces (`\ `) preserved as a single path
 *   - quoted paths (single or double)
 *   - leading `~` expanded to $HOME
 */
export function splitPastedPaths(raw: string): string[] {
	const trimmed = raw.trim();
	if (!trimmed) return [];

	// Newline-separated wins when present (Finder multi-select drop).
	const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	if (lines.length > 1) return lines.map(normalizePath);

	// Single line — split on unescaped whitespace, respecting quotes.
	const tokens: string[] = [];
	let cur = "";
	let quote: '"' | "'" | null = null;
	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i];
		if (quote) {
			if (ch === quote) {
				quote = null;
			} else {
				cur += ch;
			}
			continue;
		}
		if (ch === '"' || ch === "'") {
			quote = ch as '"' | "'";
			continue;
		}
		if (ch === "\\" && i + 1 < trimmed.length) {
			cur += trimmed[i + 1];
			i += 1;
			continue;
		}
		if (/\s/.test(ch)) {
			if (cur) {
				tokens.push(cur);
				cur = "";
			}
			continue;
		}
		cur += ch;
	}
	if (cur) tokens.push(cur);
	return tokens.length > 0 ? tokens.map(normalizePath) : [normalizePath(trimmed)];
}

function normalizePath(path: string): string {
	let out = path.trim();
	if (out.startsWith("file://")) out = out.slice("file://".length);
	if (out.startsWith("~/") || out === "~") {
		const home = process.env.HOME ?? "";
		out = home + out.slice(1);
	}
	return out;
}
