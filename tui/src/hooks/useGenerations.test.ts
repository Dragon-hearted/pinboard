import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { render } from "ink";
import { __resetDb, getGeneration, initDb, insertImage } from "../services/db";
import {
	__setFetch,
	generate as engineGenerate,
	IMAGE_ENGINE_URL,
} from "../services/imageengine";
import {
	loadReferenceImages,
	useGenerations,
	type UseGenerationsApi,
} from "./useGenerations";

type FetchArgs = { url: string; init?: RequestInit };

function mockFetch(
	handler: (req: FetchArgs) => Response | Promise<Response>,
): FetchArgs[] {
	const calls: FetchArgs[] = [];
	const impl = (async (
		input: URL | RequestInfo,
		init?: RequestInit,
	): Promise<Response> => {
		const url = typeof input === "string" ? input : (input as Request).url;
		const args = { url, init };
		calls.push(args);
		return handler(args);
	}) as unknown as typeof fetch;
	__setFetch(impl);
	return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("useGenerations ref loading", () => {
	let tmpDir: string;

	beforeEach(() => {
		__resetDb();
		initDb(":memory:");
		tmpDir = mkdtempSync(join(tmpdir(), "pinboard-test-"));
	});

	afterEach(() => {
		__resetDb();
		__setFetch(null);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("loadReferenceImages returns base64 + mimeType for valid rows", async () => {
		const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
		const path = join(tmpDir, "a.jpg");
		writeFileSync(path, bytes);
		insertImage({
			id: "img-a",
			filename: "a.jpg",
			originalName: "a.jpg",
			path,
			mimeType: "image/jpeg",
			size: bytes.length,
			createdAt: "2026-04-18T00:00:00Z",
		});

		const out = await loadReferenceImages(["img-a"]);
		expect(out).toHaveLength(1);
		expect(out[0].mimeType).toBe("image/jpeg");
		expect(out[0].data).toBe(Buffer.from(bytes).toString("base64"));
	});

	test("loadReferenceImages skips missing rows and unreadable files", async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const path = join(tmpDir, "ok.png");
		writeFileSync(path, bytes);
		insertImage({
			id: "img-ok",
			filename: "ok.png",
			originalName: "ok.png",
			path,
			mimeType: "image/png",
			size: bytes.length,
			createdAt: "2026-04-18T00:00:00Z",
		});
		insertImage({
			id: "img-missing-file",
			filename: "x.png",
			originalName: "x.png",
			path: join(tmpDir, "does-not-exist.png"),
			mimeType: "image/png",
			size: 0,
			createdAt: "2026-04-18T00:00:01Z",
		});

		const out = await loadReferenceImages([
			"img-ok",
			"img-missing-file",
			"img-not-in-db",
		]);
		expect(out).toHaveLength(1);
		expect(out[0].data).toBe(Buffer.from(bytes).toString("base64"));
	});

	test("generate request body carries aspectRatio when provided", async () => {
		const calls = mockFetch(() =>
			jsonResponse({
				id: "gen-ar",
				imageUrl: "/api/gallery/gen-ar/image",
				model: "gemini-3-pro-image-preview",
				prompt: "p",
				tokenUsage: { promptTokens: 1, candidateTokens: 2, totalTokens: 3 },
				createdAt: "2026-04-18T00:00:05Z",
			}),
		);

		const args = { prompt: "p", aspectRatio: "16:9" as const };
		// Contract mirrors useGenerations.generate spread:
		//   ...(args.aspectRatio && { aspectRatio: args.aspectRatio })
		await engineGenerate({
			prompt: args.prompt,
			...(args.aspectRatio && { aspectRatio: args.aspectRatio }),
		});

		expect(calls).toHaveLength(1);
		const body = JSON.parse(String(calls[0].init?.body));
		expect(body.aspectRatio).toBe("16:9");
	});

	test("generate request body omits aspectRatio when undefined", async () => {
		const calls = mockFetch(() =>
			jsonResponse({
				id: "gen-no-ar",
				imageUrl: "/api/gallery/gen-no-ar/image",
				model: "gemini-3-pro-image-preview",
				prompt: "p",
				tokenUsage: { promptTokens: 1, candidateTokens: 2, totalTokens: 3 },
				createdAt: "2026-04-18T00:00:05Z",
			}),
		);

		const args: { prompt: string; aspectRatio?: "16:9" } = { prompt: "p" };
		await engineGenerate({
			prompt: args.prompt,
			...(args.aspectRatio && { aspectRatio: args.aspectRatio }),
		});

		expect(calls).toHaveLength(1);
		const body = JSON.parse(String(calls[0].init?.body));
		expect(body.aspectRatio).toBeUndefined();
	});

	test("generate request body contains referenceImages, not referenceImageIds", async () => {
		const bytes = new Uint8Array([9, 8, 7, 6]);
		const path = join(tmpDir, "ref.png");
		writeFileSync(path, bytes);
		insertImage({
			id: "ref-1",
			filename: "ref.png",
			originalName: "ref.png",
			path,
			mimeType: "image/png",
			size: bytes.length,
			createdAt: "2026-04-18T00:00:00Z",
		});

		const calls = mockFetch(() =>
			jsonResponse({
				id: "gen-x",
				imageUrl: "/api/gallery/gen-x/image",
				model: "gemini-3-pro-image-preview",
				prompt: "p",
				tokenUsage: { promptTokens: 1, candidateTokens: 2, totalTokens: 3 },
				createdAt: "2026-04-18T00:00:05Z",
			}),
		);

		const referenceImages = await loadReferenceImages(["ref-1"]);
		await engineGenerate({ prompt: "p", referenceImages });

		expect(calls).toHaveLength(1);
		expect(calls[0].url).toBe(`${IMAGE_ENGINE_URL}/api/generate`);
		const body = JSON.parse(String(calls[0].init?.body));
		expect(body.referenceImages).toBeInstanceOf(Array);
		expect(body.referenceImages).toHaveLength(1);
		expect(body.referenceImages[0].data).toBe(
			Buffer.from(bytes).toString("base64"),
		);
		expect(body.referenceImages[0].mimeType).toBe("image/png");
		expect(body.referenceImageIds).toBeUndefined();
	});
});

function makeStdin() {
	const emitter = new EventEmitter() as EventEmitter & {
		isTTY: boolean;
		setRawMode: (v: boolean) => void;
		setEncoding: (enc: string) => void;
		resume: () => void;
		pause: () => void;
		read: () => string | null;
		ref: () => void;
		unref: () => void;
	};
	emitter.isTTY = true;
	emitter.setRawMode = () => {};
	emitter.setEncoding = () => {};
	emitter.resume = () => {};
	emitter.pause = () => {};
	emitter.read = () => null;
	emitter.ref = () => {};
	emitter.unref = () => {};
	return emitter;
}

const tick = () => new Promise<void>((r) => setImmediate(r));

describe("useGenerations.generate — reference intent split (only gen refs sent to model)", () => {
	let tmpDir: string;

	beforeEach(() => {
		__resetDb();
		initDb(":memory:");
		tmpDir = mkdtempSync(join(tmpdir(), "pinboard-gen-test-"));
	});

	afterEach(() => {
		__resetDb();
		__setFetch(null);
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("only generationRefIds reach body.referenceImages; promptOnlyRefIds persist in JSON but stay off the wire", async () => {
		const genBytes = new Uint8Array([1, 2, 3, 4]);
		const promptBytes = new Uint8Array([9, 8, 7, 6]);
		const genPath = join(tmpDir, "gen-ref.png");
		const promptPath = join(tmpDir, "prompt-ref.png");
		writeFileSync(genPath, genBytes);
		writeFileSync(promptPath, promptBytes);

		insertImage({
			id: "gen-ref-id",
			filename: "gen-ref.png",
			originalName: "gen-ref.png",
			path: genPath,
			mimeType: "image/png",
			size: genBytes.length,
			createdAt: "2026-04-18T00:00:00Z",
		});
		insertImage({
			id: "prompt-ref-id",
			filename: "prompt-ref.png",
			originalName: "prompt-ref.png",
			path: promptPath,
			mimeType: "image/png",
			size: promptBytes.length,
			createdAt: "2026-04-18T00:00:01Z",
		});

		const calls: { url: string; body?: string }[] = [];
		const generatedBytes = Buffer.from([0xab, 0xcd, 0xef]);
		const fetchImpl = (async (
			input: URL | RequestInfo,
			init?: RequestInit,
		): Promise<Response> => {
			const url = typeof input === "string" ? input : (input as Request).url;
			calls.push({ url, body: init?.body as string | undefined });
			if (url.endsWith("/api/generate")) {
				return jsonResponse({
					id: "gen-split",
					imageUrl: "/api/gallery/gen-split/image",
					model: "gemini-3-pro-image-preview",
					prompt: "p",
					tokenUsage: {
						promptTokens: 1,
						candidateTokens: 2,
						totalTokens: 3,
					},
					createdAt: "2026-04-18T00:01:00Z",
				});
			}
			if (url.endsWith("/api/gallery/gen-split/image")) {
				return new Response(generatedBytes, { status: 200 });
			}
			return new Response("not found", { status: 404 });
		}) as unknown as typeof fetch;
		__setFetch(fetchImpl);

		const apiRef: { current: UseGenerationsApi | null } = { current: null };
		function Probe() {
			apiRef.current = useGenerations();
			return null;
		}
		const stdin = makeStdin();
		const instance = render(React.createElement(Probe), {
			stdin: stdin as unknown as NodeJS.ReadStream,
			stdout: process.stdout,
			stderr: process.stderr,
			debug: false,
			exitOnCtrlC: false,
			patchConsole: false,
		});

		try {
			await tick();
			expect(apiRef.current).not.toBeNull();

			const record = await apiRef.current!.generate({
				prompt: "p",
				modelId: "gemini-3-pro-image-preview",
				generationRefIds: ["gen-ref-id"],
				promptOnlyRefIds: ["prompt-ref-id"],
			});

			expect(record).not.toBeNull();
			expect(record?.id).toBe("gen-split");

			const generateCall = calls.find((c) => c.url.endsWith("/api/generate"));
			expect(generateCall).toBeDefined();
			const body = JSON.parse(String(generateCall?.body));
			expect(body.referenceImages).toBeInstanceOf(Array);
			expect(body.referenceImages).toHaveLength(1);
			const datas = body.referenceImages.map(
				(r: { data: string }) => r.data,
			);
			expect(datas).toContain(Buffer.from(genBytes).toString("base64"));
			expect(datas).not.toContain(Buffer.from(promptBytes).toString("base64"));

			const persisted = getGeneration("gen-split");
			expect(persisted).not.toBeNull();
			const refsParsed = JSON.parse(persisted!.referenceImageIds);
			expect(refsParsed).toEqual({
				generation: ["gen-ref-id"],
				promptOnly: ["prompt-ref-id"],
			});
		} finally {
			instance.unmount();
		}
	});
});
