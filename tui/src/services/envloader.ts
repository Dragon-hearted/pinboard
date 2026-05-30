/**
 * envloader.ts — re-read `.env` files at runtime and merge into `process.env`.
 *
 * Bun snapshots env vars at process start, so a rotated `ANTHROPIC_API_KEY` in
 * `.env` never reaches a long-running TUI session unless we explicitly re-read
 * the file. The capital-R "reload" path calls `reloadEnvFiles()` so SDK paths
 * (`process.env.ANTHROPIC_API_KEY`, `PINBOARD_ALLOW_API`) pick up the new value
 * without a full restart.
 *
 * The image-engine subprocess re-reads its own `.env` on every WisGate call
 * (see image-engine/src/wisgate.ts), so this file does NOT need to update
 * WISDOM_GATE_KEY for that path — but doing so is harmless and helpful for
 * any future in-process consumer.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CANDIDATES = [
	resolve(import.meta.dir, "../../../.env"),
	resolve(import.meta.dir, "../../../../image-engine/.env"),
	resolve(import.meta.dir, "../../../../../.env"),
];

function parseDotenv(text: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq === -1) continue;
		const k = line.slice(0, eq).replace(/^export\s+/, "").trim();
		if (!k) continue;
		let v = line.slice(eq + 1).trim();
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		) {
			v = v.slice(1, -1);
		}
		out.set(k, v);
	}
	return out;
}

export interface ReloadEnvResult {
	filesRead: string[];
	keysUpdated: string[];
}

export function reloadEnvFiles(): ReloadEnvResult {
	const filesRead: string[] = [];
	const updated = new Set<string>();

	for (const path of CANDIDATES) {
		let raw: string;
		try {
			raw = readFileSync(path, "utf8");
		} catch {
			continue;
		}
		filesRead.push(path);
		for (const [k, v] of parseDotenv(raw)) {
			if (process.env[k] !== v) {
				process.env[k] = v;
				updated.add(k);
			}
		}
	}

	return { filesRead, keysUpdated: [...updated].sort() };
}
