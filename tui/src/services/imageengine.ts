/**
 * HTTP client for ImageEngine at localhost:3002.
 * Adapted from `systems/scene-board/src/image-client.ts` — standalone, no cross-imports.
 */

import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import type {
	BatchRequest,
	BatchResult,
	BudgetStatus,
	GenerationRequest,
	GenerationResult,
} from "./types";

export const IMAGE_ENGINE_URL =
	process.env.IMAGE_ENGINE_URL || "http://localhost:3002";

const IMAGE_ENGINE_ENTRY = resolve(
	import.meta.dir,
	"../../../../image-engine/src/index.ts",
);
const IMAGE_ENGINE_CWD = dirname(dirname(IMAGE_ENGINE_ENTRY));

export class ImageEngineError extends Error {
	constructor(
		message: string,
		public status: number,
		public body: unknown,
	) {
		super(message);
		this.name = "ImageEngineError";
	}
}

export class BudgetError extends ImageEngineError {
	constructor(message: string, body: unknown) {
		super(message, 402, body);
		this.name = "BudgetError";
	}
}

export class RateLimitError extends ImageEngineError {
	constructor(message: string, body: unknown) {
		super(message, 429, body);
		this.name = "RateLimitError";
	}
}

/** Injectable fetch for testing. Defaults to global fetch. */
let fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis);

/** Override the fetch used by the client. Tests should reset after. */
export function __setFetch(impl: typeof fetch | null): void {
	fetchImpl = impl ?? globalThis.fetch.bind(globalThis);
}

async function readErrorBody(
	res: Response,
): Promise<{ error?: string; [k: string]: unknown }> {
	try {
		return (await res.json()) as { error?: string };
	} catch {
		return { error: res.statusText };
	}
}

async function handle<T>(res: Response): Promise<T> {
	if (res.ok) return (await res.json()) as T;
	const body = await readErrorBody(res);
	const msg = body.error || res.statusText;
	if (res.status === 402) throw new BudgetError(msg, body);
	if (res.status === 429) throw new RateLimitError(msg, body);
	throw new ImageEngineError(
		`ImageEngine error ${res.status}: ${msg}`,
		res.status,
		body,
	);
}

/** GET /health — returns true on 2xx, false otherwise. Never throws. */
export async function healthCheck(): Promise<boolean> {
	try {
		const res = await fetchImpl(`${IMAGE_ENGINE_URL}/health`);
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Ensure ImageEngine is reachable. If not, spawn it as a detached child and
 * poll health every 500ms up to `timeoutMs`. Throws a descriptive error on failure.
 */
export async function ensureUp(
	opts: { timeoutMs?: number; silent?: boolean } = {},
): Promise<void> {
	const timeoutMs = opts.timeoutMs ?? 10_000;
	if (await healthCheck()) return;

	const child = spawn("bun", ["run", IMAGE_ENGINE_ENTRY], {
		cwd: IMAGE_ENGINE_CWD,
		detached: true,
		stdio: opts.silent ? "ignore" : ["ignore", "ignore", "ignore"],
	});
	child.unref();

	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		await new Promise((r) => setTimeout(r, 500));
		if (await healthCheck()) return;
	}

	throw new Error(
		`ImageEngine did not come up within ${timeoutMs}ms. ` +
			`Start it manually: cd systems/image-engine && bun run src/index.ts`,
	);
}

/**
 * Kill any running ImageEngine listening on the configured port and re-launch
 * a fresh subprocess. Used by the pinboard "reload tools" hotkey when the
 * user rotates `.env` keys — the new subprocess reads the rotated key.
 */
export async function restart(
	opts: { timeoutMs?: number; silent?: boolean } = {},
): Promise<void> {
	const port = (() => {
		try {
			return new URL(IMAGE_ENGINE_URL).port || "3002";
		} catch {
			return "3002";
		}
	})();

	try {
		const lsof = spawnSync("lsof", ["-i", `:${port}`, "-t"], {
			encoding: "utf8",
		});
		const pids = (lsof.stdout || "")
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
		for (const pid of pids) {
			spawnSync("kill", [pid]);
		}
	} catch {
		// lsof unavailable — best-effort, fall through to ensureUp
	}

	const start = Date.now();
	const killTimeout = 3000;
	while (Date.now() - start < killTimeout) {
		if (!(await healthCheck())) break;
		await new Promise((r) => setTimeout(r, 200));
	}

	await ensureUp(opts);
}

/** POST /api/generate — single image generation. */
export async function generate(
	req: GenerationRequest,
): Promise<GenerationResult> {
	const res = await fetchImpl(`${IMAGE_ENGINE_URL}/api/generate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(req),
	});
	return handle<GenerationResult>(res);
}

/** POST /api/generate/batch — batch generation with optional dependency graph. */
export async function batch(req: BatchRequest): Promise<BatchResult> {
	const res = await fetchImpl(`${IMAGE_ENGINE_URL}/api/generate/batch`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(req),
	});
	return handle<BatchResult>(res);
}

/** POST /api/gallery/:id/use-as-reference — returns base64 payload for use as a reference. */
export async function useAsReference(
	generationId: string,
): Promise<{ data: string; mimeType: string }> {
	const res = await fetchImpl(
		`${IMAGE_ENGINE_URL}/api/gallery/${encodeURIComponent(generationId)}/use-as-reference`,
		{ method: "POST" },
	);
	return handle<{ data: string; mimeType: string }>(res);
}

/** GET /api/gallery/:id/image — raw image bytes. */
export async function getImage(id: string): Promise<Buffer> {
	const res = await fetchImpl(
		`${IMAGE_ENGINE_URL}/api/gallery/${encodeURIComponent(id)}/image`,
	);
	if (!res.ok) {
		const body = await readErrorBody(res);
		throw new ImageEngineError(
			`ImageEngine error ${res.status}: ${body.error || res.statusText}`,
			res.status,
			body,
		);
	}
	return Buffer.from(await res.arrayBuffer());
}

/** GET /api/budget — current budget + token spend status. */
export async function getBudget(): Promise<BudgetStatus> {
	const res = await fetchImpl(`${IMAGE_ENGINE_URL}/api/budget`);
	return handle<BudgetStatus>(res);
}
