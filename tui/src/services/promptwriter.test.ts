import { afterEach, describe, expect, test } from "bun:test";
import {
	__resetProbeCache,
	__setSpawn,
} from "./claudevision";
import {
	__setFileReader,
	__setRegistryLoader,
	applyTemplate,
	enrichWithGuide,
	listImageModels,
	loadModelGuide,
	validatePromptForModel,
} from "./promptwriter";

const FAKE_REGISTRY = [
	{
		model: "NanoBanana Pro",
		provider: "Google (Gemini)",
		status: "production",
		type: "image" as const,
		file: "image/nanobanana-pro.md",
	},
	{
		model: "NanoBanana Flash",
		provider: "Google (Gemini)",
		status: "production",
		type: "image" as const,
		file: "image/nanobanana-flash.md",
	},
	{
		model: "Flux",
		provider: "Black Forest Labs",
		status: "production",
		type: "image" as const,
		file: "image/flux.md",
	},
	{
		model: "DALL-E 3",
		provider: "OpenAI",
		status: "production",
		type: "image" as const,
		file: "image/dalle-3.md",
	},
];

const NANOBANANA_MD = `---
model: "nanobanana-pro"
---

# NanoBanana Pro

## Overview

Flagship model.

## Constraints

| Constraint | Limit | Notes |
|------------|-------|-------|
| Max prompt length | 8,192 chars | practical sweet spot 800-1500 |
| Max reference images | 14 | |

## Prompt Structure

Use system instruction + body.

## Best Practices

Include the preamble.

## Failure Modes

Text artefacts when the terminal line is missing.
`;

const FLUX_MD = `---
model: "flux"
---

# Flux

## Overview

Open-weight.

## Constraints

| Constraint | Limit | Notes |
|------------|-------|-------|
| Max prompt length | 4,000 chars | varies by provider |

## Prompt Structure

Single-prompt.

## Best Practices

Be descriptive.

## Failure Modes

Bad hands.
`;

function installMocks() {
	__setRegistryLoader(async () => FAKE_REGISTRY);
	__setFileReader(async (path) => {
		if (path.endsWith("nanobanana-pro.md")) return NANOBANANA_MD;
		if (path.endsWith("nanobanana-flash.md")) return NANOBANANA_MD;
		if (path.endsWith("flux.md")) return FLUX_MD;
		if (path.endsWith("dalle-3.md")) return "## Constraints\n\n";
		throw new Error(`unexpected read: ${path}`);
	});
}

describe("promptwriter", () => {
	afterEach(() => {
		__setRegistryLoader(null);
		__setFileReader(null);
	});

	describe("listImageModels", () => {
		test("only returns models backed by a WisGate mapping", async () => {
			installMocks();
			const names = (await listImageModels()).map((m) => m.model);
			expect(names).toContain("NanoBanana Pro");
			expect(names).toContain("NanoBanana Flash");
			expect(names).not.toContain("Flux");
			expect(names).not.toContain("DALL-E 3");
		});

		test("attaches wisGateModel id", async () => {
			installMocks();
			const pro = (await listImageModels()).find(
				(m) => m.model === "NanoBanana Pro",
			);
			expect(pro?.wisGateModel).toBe("gemini-3-pro-image-preview");
		});
	});

	describe("loadModelGuide", () => {
		test("parses Constraints and extracts max prompt chars", async () => {
			installMocks();
			const guide = await loadModelGuide("NanoBanana Pro");
			expect(guide.maxPromptChars).toBe(8192);
			expect(guide.sections.constraints).toContain("Max prompt length");
			expect(guide.sections.overview).toContain("Flagship");
		});

		test("throws on unknown model", async () => {
			installMocks();
			await expect(loadModelGuide("does-not-exist")).rejects.toThrow();
		});
	});

	describe("applyTemplate", () => {
		test("appends terminal line for NanoBanana Pro", async () => {
			installMocks();
			const out = await applyTemplate("A woman in a red dress", "NanoBanana Pro");
			expect(out.endsWith("No text in image.")).toBe(true);
		});

		test("does not double-append terminal line", async () => {
			installMocks();
			const out = await applyTemplate(
				"A woman. No text in image.",
				"NanoBanana Pro",
			);
			const matches = out.match(/No text in image\./g) ?? [];
			expect(matches.length).toBe(1);
		});

		test("appends terminal line for NanoBanana Flash too", async () => {
			installMocks();
			const out = await applyTemplate("city at night", "NanoBanana Flash");
			expect(out.endsWith("No text in image.")).toBe(true);
		});

		test("does not append terminal line for non-NanoBanana models", async () => {
			installMocks();
			// Add Flux to the WisGate mapping for this test scenario —
			// simulate by calling applyTemplate with Flux; it should not append.
			const out = await applyTemplate("a cat", "Flux");
			expect(out).not.toContain("No text in image.");
		});

		test("truncates prompts that exceed the model cap", async () => {
			installMocks();
			const long = "word ".repeat(3000).trim(); // ~14999 chars
			const out = await applyTemplate(long, "NanoBanana Pro");
			expect(out.length).toBeLessThanOrEqual(8192);
			expect(out.endsWith("No text in image.")).toBe(true);
		});

		test("respects per-model cap for non-NanoBanana models", async () => {
			installMocks();
			const long = "a".repeat(10000);
			const out = await applyTemplate(long, "Flux");
			expect(out.length).toBeLessThanOrEqual(4000);
		});
	});

	describe("validatePromptForModel", () => {
		test("ok when prompt is in range and terminal line present", async () => {
			installMocks();
			const r = await validatePromptForModel(
				"hello. No text in image.",
				"NanoBanana Pro",
			);
			expect(r.ok).toBe(true);
			expect(r.errors).toHaveLength(0);
		});

		test("warns when NanoBanana prompt lacks terminal line", async () => {
			installMocks();
			const r = await validatePromptForModel("hello world", "NanoBanana Pro");
			expect(r.ok).toBe(true);
			expect(r.warnings.join(" ")).toContain("No text in image.");
		});

		test("errors when prompt exceeds max chars", async () => {
			installMocks();
			const long = "a".repeat(9000);
			const r = await validatePromptForModel(long, "NanoBanana Pro");
			expect(r.ok).toBe(false);
			expect(r.errors[0]).toMatch(/max/i);
		});

		test("errors when model is unknown", async () => {
			installMocks();
			const r = await validatePromptForModel("x", "Nonexistent");
			expect(r.ok).toBe(false);
			expect(r.errors[0]).toMatch(/guide/i);
		});
	});

	describe("enrichWithGuide", () => {
		afterEach(() => {
			__setSpawn(null);
			__resetProbeCache();
		});

		test("returns claudevision output on happy path (claude available)", async () => {
			installMocks();
			let i = 0;
			const responses: Array<{
				stdout?: string;
				exitCode?: number;
				spawnThrows?: Error;
			}> = [
				{ stdout: "1.0.0" },
				{ stdout: "Usage: claude --image <path>" },
				{ stdout: "  enriched output  \n" },
			];
			__setSpawn((cmd) => {
				const r = responses[i] ?? responses[responses.length - 1];
				i++;
				if (r.spawnThrows) throw r.spawnThrows;
				const enc = new TextEncoder();
				const stream = new ReadableStream<Uint8Array>({
					start(c) {
						c.enqueue(enc.encode(r.stdout ?? ""));
						c.close();
					},
				});
				const errStream = new ReadableStream<Uint8Array>({
					start(c) {
						c.close();
					},
				});
				let resolveExit!: (code: number) => void;
				const exited = new Promise<number>((res) => {
					resolveExit = res;
				});
				queueMicrotask(() => resolveExit(r.exitCode ?? 0));
				return {
					stdout: stream,
					stderr: errStream,
					exited,
					kill: () => resolveExit(137),
				};
			});

			const out = await enrichWithGuide(
				"a cat on a sofa",
				"NanoBanana Pro",
				{ imagePath: "/tmp/ref.jpg" },
			);
			expect(out).toBe("enriched output");
		});

		test("falls back to applyTemplate when claude is unavailable", async () => {
			installMocks();
			__setSpawn(() => {
				throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
			});

			const out = await enrichWithGuide(
				"a cat on a sofa",
				"NanoBanana Pro",
			);

			// applyTemplate appends NanoBanana terminal line.
			expect(out.endsWith("No text in image.")).toBe(true);
			expect(out).toContain("a cat on a sofa");
		});
	});
});
