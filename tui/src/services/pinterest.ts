/**
 * pinterest.ts — public-pin URL → reference-image pipeline.
 *
 * Phase 1: public pins only. No Playwright, no login, no board iteration.
 * Accepts `pinterest.com/pin/{id}/` and `pin.it/{short}` hosts.
 */

import { existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { ImageRecord } from "./types";

/** Signature of the DB insert function built by services-core (`./db`). */
export type InsertImageFn = (image: ImageRecord) => void | Promise<void>;

const REALISTIC_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024; // 10 MB cap

const MIME_TO_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/webp": "webp",
	"image/gif": "gif",
};

export interface PinImageInfo {
	imageUrl: string;
	width?: number;
	height?: number;
}

export interface PinDownload {
	filePath: string;
	filename: string;
	mimeType: string;
	size: number;
	originalUrl: string;
	resolvedImageUrl: string;
}

export interface ImportToDbOpts {
	uploadsDir: string;
	/** Injected by the caller (wire-flows). Keeps this module decoupled from `./db`. */
	insertImage: InsertImageFn;
}

/** Thrown on normalisation/resolution/download failures. */
export class PinterestError extends Error {
	constructor(
		message: string,
		public cause?: unknown,
	) {
		super(message);
		this.name = "PinterestError";
	}
}

/** Thrown specifically when the image exceeds `MAX_DOWNLOAD_BYTES`. */
export class PinTooLargeError extends PinterestError {
	constructor(public sizeHint: number | null) {
		super(
			sizeHint != null
				? `Pinterest image exceeds 10 MB cap (content-length=${sizeHint})`
				: `Pinterest image exceeds 10 MB cap (streamed over limit)`,
		);
		this.name = "PinTooLargeError";
	}
}

/**
 * Normalise a user-supplied URL string. Returns the canonical pin URL, or null
 * if the host is not Pinterest / pin.it.
 */
export function normalizePinUrl(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url.trim());
	} catch {
		return null;
	}

	const host = parsed.hostname.toLowerCase();
	const isPinterestHost =
		host === "pinterest.com" ||
		host === "www.pinterest.com" ||
		host.endsWith(".pinterest.com");
	const isShortHost = host === "pin.it" || host === "www.pin.it";

	if (!isPinterestHost && !isShortHost) return null;

	if (isShortHost) {
		// e.g. https://pin.it/abc123 — keep path, strip query/hash for canonicality.
		return `https://pin.it${parsed.pathname.replace(/\/+$/, "")}`;
	}

	// pinterest.com/pin/{id}/...  — require the /pin/{id} prefix.
	const match = parsed.pathname.match(/^\/pin\/([^/]+)/);
	if (!match) return null;
	return `https://www.pinterest.com/pin/${match[1]}/`;
}

/** Inject-able fetch — defaults to global fetch, tests override. */
let fetchImpl: typeof fetch = ((...args) =>
	globalThis.fetch(...(args as Parameters<typeof fetch>))) as typeof fetch;

export function __setFetch(impl: typeof fetch | null): void {
	fetchImpl = impl ?? globalThis.fetch.bind(globalThis);
}

/**
 * Fetch the pin's HTML and extract the highest-resolution image URL.
 *
 * Resolution order (spec):
 *   1. `<meta property="og:image">`
 *   2. `<meta name="twitter:image">`
 *   3. largest `<img src>` by filename-hint size
 */
export async function resolvePinImage(url: string): Promise<PinImageInfo> {
	const normalized = normalizePinUrl(url);
	if (!normalized) {
		throw new PinterestError(`Not a Pinterest URL: ${url}`);
	}

	const res = await fetchImpl(normalized, {
		headers: {
			"User-Agent": REALISTIC_UA,
			Accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.9",
		},
		redirect: "follow",
	});

	if (!res.ok) {
		throw new PinterestError(
			`Failed to fetch pin: HTTP ${res.status} ${res.statusText}`,
		);
	}

	const html = await res.text();
	const info = extractPinImageFromHtml(html);
	if (!info) {
		throw new PinterestError(
			"Could not extract image URL from pin HTML (og:image / twitter:image / <img> all missing)",
		);
	}
	return info;
}

/** Exposed for testing — parse image metadata out of raw HTML. */
export function extractPinImageFromHtml(html: string): PinImageInfo | null {
	const og = findMetaContent(html, { property: "og:image" });
	if (og) return { imageUrl: og };

	const twitter = findMetaContent(html, { name: "twitter:image" });
	if (twitter) return { imageUrl: twitter };

	const largest = findLargestImg(html);
	if (largest) return { imageUrl: largest };

	return null;
}

/** Match `<meta (property|name)="X" content="Y">` in any attribute order. */
function findMetaContent(
	html: string,
	sel: { property?: string; name?: string },
): string | null {
	const attr = sel.property ? "property" : "name";
	const val = sel.property ?? sel.name;
	if (!val) return null;
	// Two passes: content-first and key-first ordering.
	const esc = val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const rx1 = new RegExp(
		`<meta[^>]*\\b${attr}\\s*=\\s*["']${esc}["'][^>]*\\bcontent\\s*=\\s*["']([^"']+)["']`,
		"i",
	);
	const rx2 = new RegExp(
		`<meta[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*\\b${attr}\\s*=\\s*["']${esc}["']`,
		"i",
	);
	return html.match(rx1)?.[1] ?? html.match(rx2)?.[1] ?? null;
}

/**
 * Pick the largest-looking `<img>` by heuristically scoring Pinterest-style
 * paths (e.g. `/originals/` ≫ `/736x/` ≫ `/236x/`).
 */
function findLargestImg(html: string): string | null {
	const candidates = Array.from(html.matchAll(/<img[^>]*\bsrc=["']([^"']+)["']/gi))
		.map((m) => m[1])
		.filter(
			(src): src is string =>
				typeof src === "string" && /^https?:\/\//.test(src),
		);
	if (candidates.length === 0) return null;

	const score = (src: string): number => {
		if (/\/originals\//.test(src)) return 1000;
		const m = src.match(/\/(\d{2,4})x(?:\d*)?\//);
		if (m?.[1]) return Number.parseInt(m[1], 10);
		return 0;
	};

	return candidates.reduce((best, cur) => (score(cur) > score(best) ? cur : best));
}

/**
 * Download the resolved image to `destDir`. Caps at 10 MB — short-circuits on
 * `Content-Length`, else streams and byte-counts.
 */
export async function downloadPin(
	url: string,
	destDir: string,
): Promise<PinDownload> {
	const info = await resolvePinImage(url);

	if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

	const res = await fetchImpl(info.imageUrl, {
		headers: {
			"User-Agent": REALISTIC_UA,
			Referer: "https://www.pinterest.com/",
		},
		redirect: "follow",
	});
	if (!res.ok) {
		throw new PinterestError(
			`Failed to download pin image: HTTP ${res.status} ${res.statusText}`,
		);
	}

	const contentLength = res.headers.get("content-length");
	if (contentLength) {
		const declared = Number.parseInt(contentLength, 10);
		if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
			throw new PinTooLargeError(declared);
		}
	}

	const mimeType = (res.headers.get("content-type") || "image/jpeg")
		.split(";")[0]!
		.trim()
		.toLowerCase();
	const ext = MIME_TO_EXT[mimeType] ?? guessExtFromUrl(info.imageUrl) ?? "jpg";

	const bytes = await readCapped(res, MAX_DOWNLOAD_BYTES);

	const id = randomUUID();
	const filename = `${id}.${ext}`;
	const filePath = `${destDir.replace(/\/+$/, "")}/${filename}`;
	await Bun.write(filePath, bytes);

	return {
		filePath,
		filename,
		mimeType,
		size: bytes.byteLength,
		originalUrl: url,
		resolvedImageUrl: info.imageUrl,
	};
}

/** Stream response body chunks and abort if we exceed `cap`. */
async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
	if (!res.body) {
		const buf = new Uint8Array(await res.arrayBuffer());
		if (buf.byteLength > cap) throw new PinTooLargeError(buf.byteLength);
		return buf;
	}

	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		total += value.byteLength;
		if (total > cap) {
			try {
				await reader.cancel();
			} catch {
				// ignore
			}
			throw new PinTooLargeError(null);
		}
		chunks.push(value);
	}
	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}

function guessExtFromUrl(url: string): string | null {
	try {
		const pathname = new URL(url).pathname.toLowerCase();
		const m = pathname.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/);
		if (!m?.[1]) return null;
		return m[1] === "jpeg" ? "jpg" : m[1];
	} catch {
		return null;
	}
}

/**
 * End-to-end: normalise URL → download → insert into DB with
 * `source='pinterest'`, `sourceUrl=<original>`. Returns the ImageRecord.
 */
export async function importToDb(
	url: string,
	opts: ImportToDbOpts,
): Promise<ImageRecord> {
	const normalized = normalizePinUrl(url);
	if (!normalized) {
		throw new PinterestError(`Not a Pinterest URL: ${url}`);
	}

	const download = await downloadPin(normalized, opts.uploadsDir);

	const record: ImageRecord = {
		id: download.filename.replace(/\.[^.]+$/, ""),
		filename: download.filename,
		originalName: `pinterest-${download.filename}`,
		path: download.filePath,
		mimeType: download.mimeType,
		size: download.size,
		createdAt: new Date().toISOString(),
		source: "pinterest",
		sourceUrl: normalized,
	};

	await opts.insertImage(record);
	return record;
}
