/**
 * claudevision.ts — shells out to the user's already-installed `claude` CLI
 * (non-interactive mode) for vision-assisted prompt drafting. Avoids paid
 * Claude API calls by leveraging the Claude Code subscription.
 */

import { loadModelGuide } from "./promptwriter";

/** How the detected `claude` CLI accepts an image argument. */
export type ImageAttachFlag = "--image" | "--attach" | "@path";

export interface ProbeResult {
	available: boolean;
	version?: string;
	imageAttachFlag: ImageAttachFlag | null;
}

export interface DraftPromptOpts {
	imagePath: string;
	modelHint?: string;
	timeoutMs?: number;
	/** Override the CLI binary (default: `claude`). */
	binary?: string;
	/** Pre-detected attach flag; skips re-probing `claude --help`. */
	imageAttachFlag?: ImageAttachFlag;
}

/** Thrown when the `claude` binary is missing from $PATH or not executable. */
export class ClaudeUnavailableError extends Error {
	constructor(message = "claude CLI is not available on PATH") {
		super(message);
		this.name = "ClaudeUnavailableError";
	}
}

/** Thrown when `claude -p …` exceeds the configured timeout. */
export class ClaudeTimeoutError extends Error {
	constructor(public timeoutMs: number) {
		super(`claude CLI timed out after ${timeoutMs}ms`);
		this.name = "ClaudeTimeoutError";
	}
}

/** Thrown when `claude -p …` exits non-zero. `stderr` is preserved. */
export class ClaudeError extends Error {
	constructor(
		message: string,
		public exitCode: number,
		public stderr: string,
	) {
		super(message);
		this.name = "ClaudeError";
	}
}

const DRAFT_PROMPT_INSTRUCTION =
	"Analyze this image. Write a concise image-generation prompt (subject, lighting, composition, mood, style). Output ONLY the prompt text, no preamble.";

const ENHANCE_PROMPT_INSTRUCTION =
	"Rewrite the user's draft below into a high-quality image-generation prompt that follows the model's prompt-structure guide. Output ONLY the rewritten prompt text, no preamble.";

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Shape of Bun's `Subprocess` we actually consume — narrowed so tests can mock
 * it without simulating the full Bun API surface.
 */
interface SubprocessLike {
	stdout?: ReadableStream<Uint8Array> | number | null;
	stderr?: ReadableStream<Uint8Array> | number | null;
	exited: Promise<number>;
	kill(signal?: number | string): void;
}

type SpawnFn = (cmd: string[], opts: Record<string, unknown>) => SubprocessLike;

/** Default spawn implementation — thin wrapper over `Bun.spawn`. Injectable for tests. */
let spawnImpl: SpawnFn = (cmd, opts) =>
	Bun.spawn(cmd, opts as Parameters<typeof Bun.spawn>[1]) as SubprocessLike;

/** Test hook — override the spawn implementation. Pass `null` to reset. */
export function __setSpawn(impl: SpawnFn | null): void {
	spawnImpl =
		impl ??
		((cmd, opts) =>
			Bun.spawn(cmd, opts as Parameters<typeof Bun.spawn>[1]) as SubprocessLike);
}

/** Read a subprocess stream to a trimmed string. Returns "" if stream is absent. */
async function streamToString(
	stream: ReadableStream<Uint8Array> | number | null | undefined,
): Promise<string> {
	if (!stream || typeof stream === "number") return "";
	return new Response(stream).text();
}

/**
 * Probe the `claude` binary at startup:
 *   1. `claude --version` to confirm presence.
 *   2. `claude --help` to detect which image-attach syntax this version supports.
 *
 * Never throws — missing binary returns `{ available: false, imageAttachFlag: null }`.
 */
export async function probeClaudeCli(
	binary = "claude",
): Promise<ProbeResult> {
	let version: string | undefined;
	try {
		const proc = spawnImpl([binary, "--version"], {
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
		const [stdout, code] = await Promise.all([
			streamToString(proc.stdout),
			proc.exited,
		]);
		if (code !== 0) return { available: false, imageAttachFlag: null };
		version = stdout.trim() || undefined;
	} catch {
		return { available: false, imageAttachFlag: null };
	}

	let helpText = "";
	try {
		const proc = spawnImpl([binary, "--help"], {
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
		const [stdout, stderr, code] = await Promise.all([
			streamToString(proc.stdout),
			streamToString(proc.stderr),
			proc.exited,
		]);
		// Some CLIs print help to stderr; accept either.
		helpText = (code === 0 ? stdout : stdout + stderr) || stderr;
	} catch {
		return { available: true, version, imageAttachFlag: null };
	}

	return {
		available: true,
		version,
		imageAttachFlag: detectImageAttachFlag(helpText),
	};
}

/** Parse `claude --help` output and pick the best image-attach syntax. */
export function detectImageAttachFlag(help: string): ImageAttachFlag | null {
	// `--image` followed by a terminator (space, end, =, comma, bracket, paren).
	if (/--image(?=$|[\s=,\])])/.test(help)) return "--image";
	if (/--attach(?=$|[\s=,\])])/.test(help)) return "--attach";
	// @path shorthand — help text mentions `@<path>`, `@path`, or `@file`.
	if (/@(path|file|<path>|<file>)/i.test(help)) return "@path";
	return null;
}

/**
 * Spawn `claude -p "<prompt>" <image-arg>` with the detected flag, capture stdout,
 * and return the trimmed draft prompt. Enforces `timeoutMs` via process kill.
 */
export async function draftPrompt(opts: DraftPromptOpts): Promise<string> {
	const binary = opts.binary ?? "claude";
	const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	let flag: ImageAttachFlag | null = opts.imageAttachFlag ?? null;
	if (!flag) {
		const probe = await probeClaudeCli(binary);
		if (!probe.available) throw new ClaudeUnavailableError();
		flag = probe.imageAttachFlag;
		if (!flag) {
			throw new ClaudeUnavailableError(
				"claude CLI is installed but does not expose a supported image-attach flag (--image / --attach / @path)",
			);
		}
	}

	const instruction = opts.modelHint
		? `${DRAFT_PROMPT_INSTRUCTION} Target model: ${opts.modelHint}.`
		: DRAFT_PROMPT_INSTRUCTION;

	const args: string[] = ["-p"];
	if (flag === "@path") {
		// @path shorthand embeds the reference inside the prompt text itself.
		args.push(`${instruction} @${opts.imagePath}`);
	} else {
		args.push(instruction, flag, opts.imagePath);
	}

	let proc: SubprocessLike;
	try {
		proc = spawnImpl([binary, ...args], {
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
	} catch (err) {
		const msg = (err as Error)?.message ?? String(err);
		if (/ENOENT/i.test(msg) || /not found/i.test(msg)) {
			throw new ClaudeUnavailableError();
		}
		throw err;
	}

	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		try {
			proc.kill("SIGKILL");
		} catch {
			// process already exited
		}
	}, timeoutMs);

	try {
		const [stdout, stderr, code] = await Promise.all([
			streamToString(proc.stdout),
			streamToString(proc.stderr),
			proc.exited,
		]);
		if (timedOut) throw new ClaudeTimeoutError(timeoutMs);
		if (code !== 0) {
			throw new ClaudeError(
				`claude CLI exited with code ${code}: ${stderr.trim() || "<no stderr>"}`,
				code,
				stderr,
			);
		}
		return stdout.trim();
	} finally {
		clearTimeout(timer);
	}
}

export interface EnhancePromptOpts {
	draft: string;
	modelName: string;
	imagePath?: string;
	timeoutMs?: number;
	binary?: string;
}

/**
 * Enrich a user's draft prompt by shelling out to `claude -p` with the model
 * guide's `Prompt Structure` section as the leading instruction. The optional
 * `imagePath` is attached using the same flag detection as `draftPrompt`.
 */
export async function enhancePrompt(opts: EnhancePromptOpts): Promise<string> {
	const binary = opts.binary ?? "claude";
	const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	// Reuse the module-scope cached probe so repeated `w` presses do not respawn
	// `claude --version` / `--help`. The custom binary path opts out of the
	// cache because the cache is keyed on the default binary at startup.
	const probe =
		opts.binary && opts.binary !== "claude"
			? await probeClaudeCli(binary)
			: await probeAtStartup(binary);
	if (!probe.available) throw new ClaudeUnavailableError();

	let attachFlag: ImageAttachFlag | null = null;
	if (opts.imagePath) {
		attachFlag = probe.imageAttachFlag;
		if (!attachFlag) {
			throw new ClaudeUnavailableError(
				"claude CLI is installed but does not expose a supported image-attach flag (--image / --attach / @path)",
			);
		}
	}

	const guide = await loadModelGuide(opts.modelName).catch(() => null);
	const promptStructure = guide?.sections.promptStructure ?? "";
	const instruction = `${promptStructure}\n\n${ENHANCE_PROMPT_INSTRUCTION}\n\nUser draft:\n${opts.draft}`;

	const args: string[] = ["-p"];
	if (opts.imagePath && attachFlag === "@path") {
		args.push(`${instruction} @${opts.imagePath}`);
	} else if (opts.imagePath && attachFlag) {
		args.push(instruction, attachFlag, opts.imagePath);
	} else {
		args.push(instruction);
	}

	let proc: SubprocessLike;
	try {
		proc = spawnImpl([binary, ...args], {
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
	} catch (err) {
		const msg = (err as Error)?.message ?? String(err);
		if (/ENOENT/i.test(msg) || /not found/i.test(msg)) {
			throw new ClaudeUnavailableError();
		}
		throw err;
	}

	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		try {
			proc.kill("SIGKILL");
		} catch {
			// process already exited
		}
	}, timeoutMs);

	try {
		const [stdout, stderr, code] = await Promise.all([
			streamToString(proc.stdout),
			streamToString(proc.stderr),
			proc.exited,
		]);
		if (timedOut) throw new ClaudeTimeoutError(timeoutMs);
		if (code !== 0) {
			throw new ClaudeError(
				`claude CLI exited with code ${code}: ${stderr.trim() || "<no stderr>"}`,
				code,
				stderr,
			);
		}
		return stdout.trim();
	} finally {
		clearTimeout(timer);
	}
}

/** Module-scope cache for `probeAtStartup`. Cleared by `__resetProbeCache`. */
let probeCache: Promise<ProbeResult> | null = null;

/**
 * Probe the `claude` CLI exactly once per process. Subsequent calls return the
 * cached `ProbeResult` without re-spawning `claude --version`.
 */
export function probeAtStartup(binary = "claude"): Promise<ProbeResult> {
	if (!probeCache) probeCache = probeClaudeCli(binary);
	return probeCache;
}

/** Test hook — clear the cached probe so the next `probeAtStartup` re-runs. */
export function __resetProbeCache(): void {
	probeCache = null;
}
