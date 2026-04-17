import { afterEach, describe, expect, test } from "bun:test";
import {
	ClaudeError,
	ClaudeTimeoutError,
	ClaudeUnavailableError,
	__setSpawn,
	detectImageAttachFlag,
	draftPrompt,
	probeClaudeCli,
} from "./claudevision";

interface FakeProcOpts {
	stdout?: string;
	stderr?: string;
	exitCode?: number;
	/** If set, `exited` never resolves until `kill()` is called. */
	hang?: boolean;
	/** Throw on spawn (simulate ENOENT for missing binary). */
	spawnThrows?: Error;
}

function streamOf(text: string): ReadableStream<Uint8Array> {
	const enc = new TextEncoder();
	return new ReadableStream({
		start(ctrl) {
			ctrl.enqueue(enc.encode(text));
			ctrl.close();
		},
	});
}

function makeFakeSpawn(responders: Array<(cmd: string[]) => FakeProcOpts>) {
	let i = 0;
	return (cmd: string[]) => {
		const responder = responders[i] ?? responders[responders.length - 1];
		i++;
		if (!responder) throw new Error("no responder");
		const opts = responder(cmd);
		if (opts.spawnThrows) throw opts.spawnThrows;

		let resolveExit!: (code: number) => void;
		const exited: Promise<number> = new Promise((r) => {
			resolveExit = r;
		});
		if (!opts.hang) {
			queueMicrotask(() => resolveExit(opts.exitCode ?? 0));
		}

		return {
			stdout: streamOf(opts.stdout ?? ""),
			stderr: streamOf(opts.stderr ?? ""),
			exited,
			kill: () => resolveExit(137),
		};
	};
}

afterEach(() => __setSpawn(null));

describe("detectImageAttachFlag", () => {
	test("detects --image flag", () => {
		expect(
			detectImageAttachFlag("Usage: claude [-p <prompt>] [--image <path>]"),
		).toBe("--image");
	});

	test("detects --attach flag", () => {
		expect(
			detectImageAttachFlag("Options:\n  --attach <file>    Attach a file"),
		).toBe("--attach");
	});

	test("detects @path shorthand", () => {
		expect(
			detectImageAttachFlag(
				"Use @<path> in your prompt to reference a file",
			),
		).toBe("@path");
	});

	test("prefers --image when multiple appear", () => {
		expect(
			detectImageAttachFlag(
				"Options:\n  --image <path>\n  --attach <file>\n  Use @path syntax",
			),
		).toBe("--image");
	});

	test("returns null when no known syntax present", () => {
		expect(detectImageAttachFlag("Some unrelated help text")).toBeNull();
	});
});

describe("probeClaudeCli", () => {
	test("returns available with detected flag", async () => {
		__setSpawn(
			makeFakeSpawn([
				(cmd) => {
					expect(cmd).toEqual(["claude", "--version"]);
					return { stdout: "1.2.3\n" };
				},
				(cmd) => {
					expect(cmd).toEqual(["claude", "--help"]);
					return { stdout: "Usage: claude [--image <path>]" };
				},
			]),
		);
		const result = await probeClaudeCli();
		expect(result).toEqual({
			available: true,
			version: "1.2.3",
			imageAttachFlag: "--image",
		});
	});

	test("returns not available when --version throws", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({
					spawnThrows: Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
				}),
			]),
		);
		const result = await probeClaudeCli();
		expect(result.available).toBe(false);
		expect(result.imageAttachFlag).toBeNull();
	});

	test("returns not available when --version exits non-zero", async () => {
		__setSpawn(makeFakeSpawn([() => ({ exitCode: 1 })]));
		const result = await probeClaudeCli();
		expect(result.available).toBe(false);
	});

	test("available but null flag when help has no known syntax", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "1.0.0" }),
				() => ({ stdout: "some boring help" }),
			]),
		);
		const result = await probeClaudeCli();
		expect(result.available).toBe(true);
		expect(result.imageAttachFlag).toBeNull();
	});
});

describe("draftPrompt", () => {
	test("returns trimmed stdout with --image flag", async () => {
		__setSpawn(
			makeFakeSpawn([
				(cmd) => {
					expect(cmd[0]).toBe("claude");
					expect(cmd).toContain("-p");
					expect(cmd).toContain("--image");
					expect(cmd).toContain("/tmp/ref.jpg");
					return { stdout: "  A serene forest at dawn.  \n" };
				},
			]),
		);
		const out = await draftPrompt({
			imagePath: "/tmp/ref.jpg",
			imageAttachFlag: "--image",
		});
		expect(out).toBe("A serene forest at dawn.");
	});

	test("uses --attach flag when specified", async () => {
		__setSpawn(
			makeFakeSpawn([
				(cmd) => {
					expect(cmd).toContain("--attach");
					expect(cmd).toContain("/tmp/x.jpg");
					return { stdout: "prompt text" };
				},
			]),
		);
		await draftPrompt({
			imagePath: "/tmp/x.jpg",
			imageAttachFlag: "--attach",
		});
	});

	test("@path flag embeds reference in prompt text", async () => {
		__setSpawn(
			makeFakeSpawn([
				(cmd) => {
					expect(cmd[0]).toBe("claude");
					expect(cmd[1]).toBe("-p");
					expect(cmd[2]).toContain("@/tmp/x.jpg");
					expect(cmd).not.toContain("--image");
					expect(cmd).not.toContain("--attach");
					return { stdout: "ok" };
				},
			]),
		);
		await draftPrompt({
			imagePath: "/tmp/x.jpg",
			imageAttachFlag: "@path",
		});
	});

	test("throws ClaudeError on non-zero exit, includes stderr", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({
					stdout: "",
					stderr: "401 Unauthorized\n",
					exitCode: 2,
				}),
			]),
		);
		await expect(
			draftPrompt({ imagePath: "/tmp/x.jpg", imageAttachFlag: "--image" }),
		).rejects.toBeInstanceOf(ClaudeError);

		try {
			await draftPrompt({
				imagePath: "/tmp/x.jpg",
				imageAttachFlag: "--image",
			});
			throw new Error("expected throw");
		} catch (err) {
			const e = err as ClaudeError;
			expect(e.exitCode).toBe(2);
			expect(e.stderr).toContain("401");
		}
	});

	test("throws ClaudeUnavailableError when spawn ENOENTs", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({
					spawnThrows: Object.assign(new Error("ENOENT: claude not found"), {
						code: "ENOENT",
					}),
				}),
			]),
		);
		await expect(
			draftPrompt({ imagePath: "/tmp/x.jpg", imageAttachFlag: "--image" }),
		).rejects.toBeInstanceOf(ClaudeUnavailableError);
	});

	test("throws ClaudeTimeoutError when process exceeds timeoutMs", async () => {
		__setSpawn(makeFakeSpawn([() => ({ hang: true })]));
		await expect(
			draftPrompt({
				imagePath: "/tmp/x.jpg",
				imageAttachFlag: "--image",
				timeoutMs: 50,
			}),
		).rejects.toBeInstanceOf(ClaudeTimeoutError);
	});

	test("probes on-the-fly when imageAttachFlag not provided", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "1.0.0" }),
				() => ({ stdout: "Usage: claude --image <path>" }),
				(cmd) => {
					expect(cmd).toContain("--image");
					return { stdout: "drafted prompt" };
				},
			]),
		);
		const out = await draftPrompt({ imagePath: "/tmp/x.jpg" });
		expect(out).toBe("drafted prompt");
	});

	test("throws ClaudeUnavailableError when probe says unavailable", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({
					spawnThrows: Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
				}),
			]),
		);
		await expect(
			draftPrompt({ imagePath: "/tmp/x.jpg" }),
		).rejects.toBeInstanceOf(ClaudeUnavailableError);
	});
});
