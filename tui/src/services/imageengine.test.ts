import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	__setFetch,
	BudgetError,
	generate,
	getBudget,
	getImage,
	healthCheck,
	IMAGE_ENGINE_URL,
	ImageEngineError,
	RateLimitError,
	useAsReference,
} from "./imageengine";

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

describe("imageengine client", () => {
	afterEach(() => __setFetch(null));

	describe("healthCheck", () => {
		test("true on 200", async () => {
			mockFetch(() => new Response("ok", { status: 200 }));
			expect(await healthCheck()).toBe(true);
		});

		test("false on non-2xx", async () => {
			mockFetch(() => new Response("fail", { status: 500 }));
			expect(await healthCheck()).toBe(false);
		});

		test("false when fetch throws", async () => {
			__setFetch((async () => {
				throw new Error("connection refused");
			}) as unknown as typeof fetch);
			expect(await healthCheck()).toBe(false);
		});
	});

	describe("generate", () => {
		test("posts JSON and returns result", async () => {
			const calls = mockFetch(() =>
				jsonResponse({
					id: "gen-1",
					imageUrl: "/api/gallery/gen-1/image",
					model: "gemini-3-pro-image-preview",
					prompt: "hello",
					tokenUsage: {
						promptTokens: 10,
						candidateTokens: 20,
						totalTokens: 30,
					},
					createdAt: "2026-04-18T00:00:00Z",
				}),
			);
			const result = await generate({ prompt: "hello" });
			expect(result.id).toBe("gen-1");
			expect(calls).toHaveLength(1);
			expect(calls[0].url).toBe(`${IMAGE_ENGINE_URL}/api/generate`);
			expect(calls[0].init?.method).toBe("POST");
			expect(JSON.parse(String(calls[0].init?.body))).toEqual({
				prompt: "hello",
			});
		});

		test("402 throws BudgetError", async () => {
			mockFetch(() => jsonResponse({ error: "budget exceeded" }, 402));
			await expect(generate({ prompt: "x" })).rejects.toBeInstanceOf(
				BudgetError,
			);
		});

		test("429 throws RateLimitError", async () => {
			mockFetch(() => jsonResponse({ error: "slow down" }, 429));
			await expect(generate({ prompt: "x" })).rejects.toBeInstanceOf(
				RateLimitError,
			);
		});

		test("500 throws ImageEngineError", async () => {
			mockFetch(() => jsonResponse({ error: "boom" }, 500));
			let err: unknown;
			try {
				await generate({ prompt: "x" });
			} catch (e) {
				err = e;
			}
			expect(err).toBeInstanceOf(ImageEngineError);
			expect((err as ImageEngineError).status).toBe(500);
		});

		test("network failure surfaces original error", async () => {
			__setFetch((async () => {
				throw new Error("ECONNREFUSED");
			}) as unknown as typeof fetch);
			await expect(generate({ prompt: "x" })).rejects.toThrow(
				"ECONNREFUSED",
			);
		});
	});

	describe("useAsReference", () => {
		test("POSTs and returns payload", async () => {
			const calls = mockFetch(() =>
				jsonResponse({ data: "b64", mimeType: "image/png" }),
			);
			const result = await useAsReference("gen-1");
			expect(result.data).toBe("b64");
			expect(calls[0].url).toBe(
				`${IMAGE_ENGINE_URL}/api/gallery/gen-1/use-as-reference`,
			);
			expect(calls[0].init?.method).toBe("POST");
		});
	});

	describe("getImage", () => {
		test("returns a Buffer", async () => {
			mockFetch(
				() =>
					new Response(new Uint8Array([1, 2, 3]), {
						status: 200,
						headers: { "Content-Type": "image/png" },
					}),
			);
			const buf = await getImage("gen-1");
			expect(Buffer.isBuffer(buf)).toBe(true);
			expect(buf.length).toBe(3);
		});

		test("throws on 404", async () => {
			mockFetch(() => jsonResponse({ error: "not found" }, 404));
			await expect(getImage("nope")).rejects.toBeInstanceOf(
				ImageEngineError,
			);
		});
	});

	describe("getBudget", () => {
		test("returns budget status", async () => {
			mockFetch(() =>
				jsonResponse({
					tokenCeiling: 1000,
					tokensSpent: 100,
					tokensRemaining: 900,
					percentUsed: 10,
					isActive: true,
				}),
			);
			const b = await getBudget();
			expect(b.tokenCeiling).toBe(1000);
			expect(b.percentUsed).toBe(10);
		});
	});
});
