import { afterEach, describe, expect, test } from "bun:test";
import {
	ClaudeError,
	ClaudeTimeoutError,
	ClaudeUnavailableError,
	__resetProbeCache,
	__setSpawn,
	detectImageAttachFlag,
	draftPrompt,
	enhancePrompt,
	probeAtStartup,
	probeClaudeCli,
} from "./claudevision";
import {
	__setFileReader,
	__setRegistryLoader,
} from "./promptwriter";

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

afterEach(() => {
	__setSpawn(null);
	__resetProbeCache();
	__setRegistryLoader(null);
	__setFileReader(null);
});

const FAKE_REGISTRY_FOR_VISION = [
	{
		model: "NanoBanana Pro",
		provider: "Google (Gemini)",
		status: "production",
		type: "image" as const,
		file: "image/nanobanana-pro.md",
	},
];

const NANOBANANA_GUIDE_MD = `---
model: "nanobanana-pro"
---

# NanoBanana Pro

## Constraints

| Constraint | Limit | Notes |
|------------|-------|-------|
| Max prompt length | 8,192 chars | |

## Prompt Structure

Use system instruction + body. Lead with subject and lighting.
`;

function installGuideMocks() {
	__setRegistryLoader(async () => FAKE_REGISTRY_FOR_VISION);
	__setFileReader(async (path) => {
		if (path.endsWith("nanobanana-pro.md")) return NANOBANANA_GUIDE_MD;
		throw new Error(`unexpected read: ${path}`);
	});
}

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

	test("falls back to @path when help omits explicit image-attach flags", async () => {
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "1.0.0" }),
				() => ({ stdout: "some boring help" }),
			]),
		);
		const result = await probeClaudeCli();
		expect(result.available).toBe(true);
		// Modern Claude Code accepts @<path> mentions inside the prompt — the
		// probe defaults to "@path" so the vision flows still work even when
		// --help no longer enumerates explicit attach flags.
		expect(result.imageAttachFlag).toBe("@path");
	});

	test("falls back to @path against a real claude 2.1.119-style --help slice", async () => {
		// Representative slice of `claude --help` output from Claude Code v2.1.119:
		// no --image, no --attach, no @<path>/@<file> mentions in the option list.
		const realHelpSlice = [
			"Usage: claude [options]",
			"  --bare                                            Minimal mode",
			"  -d, --debug [filter]                              Enable debug mode",
			"  --debug-file <path>                               Write debug logs",
			"  --file <specs...>                                 File resources to download at startup. Format: file_id:relative_path",
			"  --mcp-config <configs...>                         Load MCP servers",
			"  --plugin-dir <path>                               Load plugins from a directory",
			"  --settings <file-or-json>                         Path to a settings JSON file",
			"  --tools <tools...>                                Specify the list of available tools",
		].join("\n");
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "2.1.119 (Claude Code)" }),
				() => ({ stdout: realHelpSlice }),
			]),
		);
		const result = await probeClaudeCli();
		expect(result.available).toBe(true);
		expect(result.version).toBe("2.1.119 (Claude Code)");
		expect(result.imageAttachFlag).toBe("@path");
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

describe("enhancePrompt", () => {
	test("composes instruction with promptStructure section + user draft", async () => {
		installGuideMocks();
		let capturedPrompt = "";
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "1.0.0" }),
				() => ({ stdout: "Usage: claude --image <path>" }),
				(cmd) => {
					expect(cmd[0]).toBe("claude");
					expect(cmd[1]).toBe("-p");
					capturedPrompt = cmd[2] ?? "";
					expect(cmd).toContain("--image");
					expect(cmd).toContain("/tmp/ref.jpg");
					return { stdout: "  enriched prompt body  \n" };
				},
			]),
		);
		const out = await enhancePrompt({
			draft: "a cat on a sofa",
			modelName: "NanoBanana Pro",
			imagePath: "/tmp/ref.jpg",
		});
		expect(out).toBe("enriched prompt body");
		expect(capturedPrompt).toContain("Use system instruction + body");
		expect(capturedPrompt).toContain("Lead with subject and lighting");
		expect(capturedPrompt).toContain("User draft:");
		expect(capturedPrompt).toContain("a cat on a sofa");
	});

	test("works without imagePath (text-only enrichment)", async () => {
		installGuideMocks();
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "1.0.0" }),
				() => ({ stdout: "Usage: claude --image <path>" }),
				(cmd) => {
					expect(cmd).not.toContain("--image");
					expect(cmd).not.toContain("--attach");
					return { stdout: "text-only enriched" };
				},
			]),
		);
		const out = await enhancePrompt({
			draft: "draft body",
			modelName: "NanoBanana Pro",
		});
		expect(out).toBe("text-only enriched");
	});

	test("@path flag embeds reference inside instruction text", async () => {
		installGuideMocks();
		__setSpawn(
			makeFakeSpawn([
				() => ({ stdout: "1.0.0" }),
				() => ({ stdout: "Use @<path> to reference a file" }),
				(cmd) => {
					expect(cmd[0]).toBe("claude");
					expect(cmd[1]).toBe("-p");
					expect(cmd[2]).toContain("@/tmp/ref.jpg");
					expect(cmd).not.toContain("--image");
					return { stdout: "ok" };
				},
			]),
		);
		await enhancePrompt({
			draft: "x",
			modelName: "NanoBanana Pro",
			imagePath: "/tmp/ref.jpg",
		});
	});

	test("throws ClaudeUnavailableError when probe says unavailable", async () => {
		installGuideMocks();
		__setSpawn(
			makeFakeSpawn([
				() => ({
					spawnThrows: Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
				}),
			]),
		);
		await expect(
			enhancePrompt({ draft: "x", modelName: "NanoBanana Pro" }),
		).rejects.toBeInstanceOf(ClaudeUnavailableError);
	});

	test("reuses probeAtStartup cache — does not respawn --version/--help on repeat calls", async () => {
		installGuideMocks();
		let versionCalls = 0;
		let helpCalls = 0;
		// Warm the cache exactly once with --version + --help, then serve four
		// `claude -p ...` runs from a single sequence. If enhancePrompt bypasses
		// the cache it will re-consume version/help stubs and our counters fail.
		__setSpawn(
			makeFakeSpawn([
				() => {
					versionCalls += 1;
					return { stdout: "1.0.0" };
				},
				() => {
					helpCalls += 1;
					return { stdout: "Usage: claude --image <path>" };
				},
				() => ({ stdout: "out1" }),
				() => ({ stdout: "out2" }),
				() => ({ stdout: "out3" }),
				() => ({ stdout: "out4" }),
			]),
		);

		await probeAtStartup();
		await enhancePrompt({ draft: "a", modelName: "NanoBanana Pro" });
		await enhancePrompt({ draft: "b", modelName: "NanoBanana Pro" });
		await enhancePrompt({
			draft: "c",
			modelName: "NanoBanana Pro",
			imagePath: "/tmp/r.jpg",
		});
		await enhancePrompt({
			draft: "d",
			modelName: "NanoBanana Pro",
			imagePath: "/tmp/r.jpg",
		});

		expect(versionCalls).toBe(1);
		expect(helpCalls).toBe(1);
	});
});

describe("probeAtStartup", () => {
	test("caches across calls — only one --version spawn", async () => {
		let versionCalls = 0;
		__setSpawn(
			makeFakeSpawn([
				() => {
					versionCalls += 1;
					return { stdout: "1.0.0" };
				},
				() => ({ stdout: "Usage: claude --image <path>" }),
				() => {
					versionCalls += 1;
					return { stdout: "should not happen" };
				},
			]),
		);

		const r1 = await probeAtStartup();
		const r2 = await probeAtStartup();
		const r3 = await probeAtStartup();

		expect(versionCalls).toBe(1);
		expect(r1).toBe(r2);
		expect(r2).toBe(r3);
		expect(r1.available).toBe(true);
		expect(r1.imageAttachFlag).toBe("--image");
	});

	test("re-probes after __resetProbeCache()", async () => {
		let versionCalls = 0;
		__setSpawn(
			makeFakeSpawn([
				() => {
					versionCalls += 1;
					return { stdout: "1.0.0" };
				},
				() => ({ stdout: "Usage: claude --image <path>" }),
				() => {
					versionCalls += 1;
					return { stdout: "1.0.0" };
				},
				() => ({ stdout: "Usage: claude --image <path>" }),
			]),
		);

		await probeAtStartup();
		__resetProbeCache();
		await probeAtStartup();
		expect(versionCalls).toBe(2);
	});
});
