import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	PinTooLargeError,
	PinterestError,
	__setFetch,
	downloadPin,
	extractPinImageFromHtml,
	importToDb,
	normalizePinUrl,
	resolvePinImage,
} from "./pinterest";
import type { ImageRecord } from "./types";

const PIN_ID = "123456789012345678";
const CANONICAL = `https://www.pinterest.com/pin/${PIN_ID}/`;

function tmpDir(): string {
	return mkdtempSync(join(tmpdir(), "pinboard-pin-test-"));
}

function htmlResponse(html: string, status = 200): Response {
	return new Response(html, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function binaryResponse(
	bytes: Uint8Array,
	contentType = "image/jpeg",
	extraHeaders: Record<string, string> = {},
): Response {
	// Copy to a standalone ArrayBuffer so Response's BodyInit accepts it.
	const ab = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(ab).set(bytes);
	return new Response(ab, {
		status: 200,
		headers: {
			"Content-Type": contentType,
			"Content-Length": String(bytes.byteLength),
			...extraHeaders,
		},
	});
}

/** Simple router-style mock fetch. */
function routedFetch(
	routes: Array<{
		match: (url: string) => boolean;
		respond: (url: string) => Response | Promise<Response>;
	}>,
): typeof fetch {
	return (async (
		input: RequestInfo | URL,
		_init?: RequestInit,
	): Promise<Response> => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.toString()
					: input.url;
		for (const route of routes) {
			if (route.match(url)) return route.respond(url);
		}
		throw new Error(`no mock route for ${url}`);
	}) as typeof fetch;
}

afterEach(() => __setFetch(null));

describe("normalizePinUrl", () => {
	test("accepts www.pinterest.com/pin/{id}/", () => {
		expect(normalizePinUrl(CANONICAL)).toBe(CANONICAL);
	});

	test("accepts bare pinterest.com/pin/{id}/", () => {
		expect(normalizePinUrl(`https://pinterest.com/pin/${PIN_ID}/`)).toBe(
			CANONICAL,
		);
	});

	test("accepts regional subdomains (uk.pinterest.com)", () => {
		expect(normalizePinUrl(`https://uk.pinterest.com/pin/${PIN_ID}/`)).toBe(
			CANONICAL,
		);
	});

	test("accepts pin.it short links", () => {
		expect(normalizePinUrl("https://pin.it/abc123XYZ")).toBe(
			"https://pin.it/abc123XYZ",
		);
	});

	test("strips query params from canonical pin URLs", () => {
		expect(
			normalizePinUrl(`https://www.pinterest.com/pin/${PIN_ID}/?tracking=1`),
		).toBe(CANONICAL);
	});

	test("rejects non-Pinterest hosts", () => {
		expect(normalizePinUrl("https://example.com/pin/123/")).toBeNull();
		expect(normalizePinUrl("https://pinterest.evil.com/pin/123/")).toBeNull();
		expect(normalizePinUrl("https://twitter.com/foo")).toBeNull();
	});

	test("rejects pinterest URLs that aren't pin pages", () => {
		expect(normalizePinUrl("https://www.pinterest.com/board/xyz/")).toBeNull();
		expect(normalizePinUrl("https://www.pinterest.com/")).toBeNull();
	});

	test("rejects malformed URLs", () => {
		expect(normalizePinUrl("not a url")).toBeNull();
		expect(normalizePinUrl("")).toBeNull();
	});
});

describe("extractPinImageFromHtml", () => {
	test("extracts og:image", () => {
		const html = `
			<html><head>
				<meta property="og:image" content="https://i.pinimg.com/originals/aa/bb/pin.jpg" />
				<meta name="twitter:image" content="https://i.pinimg.com/736x/twitter.jpg" />
			</head></html>
		`;
		expect(extractPinImageFromHtml(html)).toEqual({
			imageUrl: "https://i.pinimg.com/originals/aa/bb/pin.jpg",
		});
	});

	test("falls back to twitter:image", () => {
		const html = `
			<html><head>
				<meta name="twitter:image" content="https://i.pinimg.com/736x/twitter.jpg" />
			</head></html>
		`;
		expect(extractPinImageFromHtml(html)).toEqual({
			imageUrl: "https://i.pinimg.com/736x/twitter.jpg",
		});
	});

	test("falls back to largest <img>", () => {
		const html = `
			<body>
				<img src="https://i.pinimg.com/236x/small.jpg" />
				<img src="https://i.pinimg.com/originals/xl.jpg" />
				<img src="https://i.pinimg.com/736x/med.jpg" />
			</body>
		`;
		expect(extractPinImageFromHtml(html)).toEqual({
			imageUrl: "https://i.pinimg.com/originals/xl.jpg",
		});
	});

	test("handles reversed meta attribute order", () => {
		const html = `
			<meta content="https://i.pinimg.com/originals/reversed.jpg" property="og:image">
		`;
		expect(extractPinImageFromHtml(html)?.imageUrl).toBe(
			"https://i.pinimg.com/originals/reversed.jpg",
		);
	});

	test("returns null when no image sources present", () => {
		expect(extractPinImageFromHtml("<html><body>no images</body></html>")).toBeNull();
	});
});

describe("resolvePinImage", () => {
	test("fetches pin HTML and extracts og:image", async () => {
		const html = `<meta property="og:image" content="https://i.pinimg.com/originals/pin.jpg">`;
		__setFetch(
			routedFetch([
				{
					match: (u) => u === CANONICAL,
					respond: () => htmlResponse(html),
				},
			]),
		);
		const info = await resolvePinImage(CANONICAL);
		expect(info.imageUrl).toBe("https://i.pinimg.com/originals/pin.jpg");
	});

	test("rejects non-Pinterest URLs", async () => {
		await expect(
			resolvePinImage("https://example.com/pin/123"),
		).rejects.toBeInstanceOf(PinterestError);
	});

	test("follows redirects for pin.it short links (fetch redirect:follow)", async () => {
		const html = `<meta property="og:image" content="https://i.pinimg.com/originals/short.jpg">`;
		let calls = 0;
		__setFetch(
			routedFetch([
				{
					match: (u) => u.startsWith("https://pin.it/"),
					respond: () => {
						calls++;
						return htmlResponse(html);
					},
				},
			]),
		);
		const info = await resolvePinImage("https://pin.it/abc123");
		expect(calls).toBe(1);
		expect(info.imageUrl).toBe("https://i.pinimg.com/originals/short.jpg");
	});

	test("throws when HTML fetch returns non-2xx", async () => {
		__setFetch(
			routedFetch([
				{
					match: () => true,
					respond: () => new Response("gone", { status: 404 }),
				},
			]),
		);
		await expect(resolvePinImage(CANONICAL)).rejects.toBeInstanceOf(
			PinterestError,
		);
	});

	test("throws when no image URL can be extracted", async () => {
		__setFetch(
			routedFetch([
				{
					match: () => true,
					respond: () => htmlResponse("<html></html>"),
				},
			]),
		);
		await expect(resolvePinImage(CANONICAL)).rejects.toBeInstanceOf(
			PinterestError,
		);
	});
});

describe("downloadPin", () => {
	test("downloads to destDir with UUID filename and correct extension", async () => {
		const dest = tmpDir();
		try {
			const imgUrl = "https://i.pinimg.com/originals/hello.png";
			const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
			__setFetch(
				routedFetch([
					{
						match: (u) => u === CANONICAL,
						respond: () =>
							htmlResponse(
								`<meta property="og:image" content="${imgUrl}">`,
							),
					},
					{
						match: (u) => u === imgUrl,
						respond: () => binaryResponse(bytes, "image/png"),
					},
				]),
			);
			const result = await downloadPin(CANONICAL, dest);
			expect(result.mimeType).toBe("image/png");
			expect(result.size).toBe(bytes.byteLength);
			expect(result.filename).toMatch(/^[a-f0-9-]{36}\.png$/);
			expect(existsSync(result.filePath)).toBe(true);
			const written = readFileSync(result.filePath);
			expect(written.byteLength).toBe(bytes.byteLength);
		} finally {
			rmSync(dest, { recursive: true, force: true });
		}
	});

	test("rejects up-front when Content-Length exceeds 10 MB cap", async () => {
		const dest = tmpDir();
		try {
			const imgUrl = "https://i.pinimg.com/originals/huge.jpg";
			__setFetch(
				routedFetch([
					{
						match: (u) => u === CANONICAL,
						respond: () =>
							htmlResponse(
								`<meta property="og:image" content="${imgUrl}">`,
							),
					},
					{
						match: (u) => u === imgUrl,
						respond: () =>
							new Response(new Uint8Array(0), {
								status: 200,
								headers: {
									"Content-Type": "image/jpeg",
									"Content-Length": String(11 * 1024 * 1024),
								},
							}),
					},
				]),
			);
			await expect(downloadPin(CANONICAL, dest)).rejects.toBeInstanceOf(
				PinTooLargeError,
			);
		} finally {
			rmSync(dest, { recursive: true, force: true });
		}
	});

	test("rejects mid-stream when streamed bytes exceed cap (no Content-Length)", async () => {
		const dest = tmpDir();
		try {
			const imgUrl = "https://i.pinimg.com/originals/stream.jpg";
			// 2 chunks of 6 MB each → over 10 MB cap partway through chunk 2.
			const chunk = new Uint8Array(6 * 1024 * 1024);
			const streamBody = new ReadableStream({
				start(ctrl) {
					ctrl.enqueue(chunk);
					ctrl.enqueue(chunk);
					ctrl.close();
				},
			});
			__setFetch(
				routedFetch([
					{
						match: (u) => u === CANONICAL,
						respond: () =>
							htmlResponse(
								`<meta property="og:image" content="${imgUrl}">`,
							),
					},
					{
						match: (u) => u === imgUrl,
						respond: () =>
							new Response(streamBody, {
								status: 200,
								headers: { "Content-Type": "image/jpeg" },
							}),
					},
				]),
			);
			await expect(downloadPin(CANONICAL, dest)).rejects.toBeInstanceOf(
				PinTooLargeError,
			);
		} finally {
			rmSync(dest, { recursive: true, force: true });
		}
	});

	test("falls back to URL extension when MIME is unknown", async () => {
		const dest = tmpDir();
		try {
			const imgUrl = "https://i.pinimg.com/originals/foo.webp";
			__setFetch(
				routedFetch([
					{
						match: (u) => u === CANONICAL,
						respond: () =>
							htmlResponse(
								`<meta property="og:image" content="${imgUrl}">`,
							),
					},
					{
						match: (u) => u === imgUrl,
						respond: () =>
							binaryResponse(
								new Uint8Array([1, 2, 3, 4]),
								"application/octet-stream",
							),
					},
				]),
			);
			const result = await downloadPin(CANONICAL, dest);
			expect(result.filename.endsWith(".webp")).toBe(true);
		} finally {
			rmSync(dest, { recursive: true, force: true });
		}
	});
});

describe("importToDb", () => {
	test("downloads and calls insertImage with source='pinterest' + sourceUrl", async () => {
		const dest = tmpDir();
		try {
			const imgUrl = "https://i.pinimg.com/originals/final.jpg";
			const bytes = new Uint8Array([255, 216, 255, 224]);
			__setFetch(
				routedFetch([
					{
						match: (u) => u === CANONICAL,
						respond: () =>
							htmlResponse(
								`<meta property="og:image" content="${imgUrl}">`,
							),
					},
					{
						match: (u) => u === imgUrl,
						respond: () => binaryResponse(bytes, "image/jpeg"),
					},
				]),
			);

			const inserted: ImageRecord[] = [];
			const record = await importToDb(CANONICAL, {
				uploadsDir: dest,
				insertImage: (r) => {
					inserted.push(r);
				},
			});
			expect(inserted).toHaveLength(1);
			expect(inserted[0]).toEqual(record);
			expect(record.source).toBe("pinterest");
			expect(record.sourceUrl).toBe(CANONICAL);
			expect(record.mimeType).toBe("image/jpeg");
			expect(record.size).toBe(bytes.byteLength);
			expect(record.path.startsWith(dest)).toBe(true);
			expect(existsSync(record.path)).toBe(true);
		} finally {
			rmSync(dest, { recursive: true, force: true });
		}
	});

	test("throws PinterestError for non-Pinterest URLs", async () => {
		await expect(
			importToDb("https://example.com/foo", {
				uploadsDir: "/tmp/whatever",
				insertImage: () => {},
			}),
		).rejects.toBeInstanceOf(PinterestError);
	});
});
