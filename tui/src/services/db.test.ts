import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	__resetDb,
	deleteImage,
	deleteImagesBySource,
	getGeneration,
	getImage,
	initDb,
	insertGeneration,
	insertImage,
	listGenerations,
	listImages,
} from "./db";

function fresh() {
	__resetDb();
	return initDb(":memory:");
}

describe("db", () => {
	afterEach(() => __resetDb());

	test("initDb creates tables with new source columns", () => {
		const db = fresh();
		const cols = (
			db.prepare("PRAGMA table_info(images)").all() as {
				name: string;
			}[]
		).map((c) => c.name);
		expect(cols).toContain("source");
		expect(cols).toContain("sourceUrl");
	});

	test("migration is idempotent — re-running does not throw", () => {
		const db = fresh();
		// Manually re-run migration steps (simulates a second initDb).
		const cols = (
			db.prepare("PRAGMA table_info(images)").all() as {
				name: string;
			}[]
		).map((c) => c.name);
		expect(cols).toContain("source");
		expect(() => initDb(":memory:")).not.toThrow();
	});

	test("insertImage + listImages round-trip", () => {
		fresh();
		insertImage({
			id: "img-1",
			filename: "a.png",
			originalName: "a.png",
			path: "/tmp/a.png",
			mimeType: "image/png",
			size: 10,
			createdAt: "2026-04-18T00:00:00Z",
			source: "pinterest",
			sourceUrl: "https://pin.example",
		});
		const all = listImages();
		expect(all).toHaveLength(1);
		expect(all[0].source).toBe("pinterest");
		expect(all[0].sourceUrl).toBe("https://pin.example");
	});

	test("insertImage defaults source to 'upload' when omitted", () => {
		fresh();
		insertImage({
			id: "img-2",
			filename: "b.png",
			originalName: "b.png",
			path: "/tmp/b.png",
			mimeType: "image/png",
			size: 1,
			createdAt: "2026-04-18T00:00:01Z",
		});
		const got = getImage("img-2");
		expect(got?.source).toBe("upload");
	});

	test("insertGeneration does NOT mirror into images table", () => {
		// Gallery represents user-uploaded refs only — generations stay in
		// the generations table until the user explicitly promotes one via `u`.
		fresh();
		insertGeneration({
			id: "gen-1",
			prompt: "hello",
			model: "gemini-3-pro-image-preview",
			resultPath: "/tmp/gen-1.png",
			referenceImageIds: JSON.stringify([]),
			createdAt: "2026-04-18T00:00:02Z",
		});

		expect(listGenerations()).toHaveLength(1);
		expect(getImage("gen-1")).toBeNull();
	});

	test("listImages orders by createdAt DESC", () => {
		fresh();
		insertImage({
			id: "old",
			filename: "o.png",
			originalName: "o.png",
			path: "/tmp/o.png",
			mimeType: "image/png",
			size: 1,
			createdAt: "2026-04-18T00:00:00Z",
		});
		insertImage({
			id: "new",
			filename: "n.png",
			originalName: "n.png",
			path: "/tmp/n.png",
			mimeType: "image/png",
			size: 1,
			createdAt: "2026-04-18T00:00:05Z",
		});
		const ids = listImages().map((r) => r.id);
		expect(ids).toEqual(["new", "old"]);
	});

	test("deleteImage removes row even when file is absent", () => {
		fresh();
		insertImage({
			id: "img-3",
			filename: "c.png",
			originalName: "c.png",
			path: "/nonexistent/path/xxxxx.png",
			mimeType: "image/png",
			size: 1,
			createdAt: "2026-04-18T00:00:03Z",
		});
		deleteImage("img-3");
		expect(getImage("img-3")).toBeNull();
	});

	test("getGeneration returns null for missing ids", () => {
		fresh();
		expect(getGeneration("nope")).toBeNull();
	});

	describe("deleteImagesBySource", () => {
		let tmpDir: string;

		beforeEach(() => {
			tmpDir = mkdtempSync(join(tmpdir(), "pinboard-source-test-"));
		});

		afterEach(() => {
			rmSync(tmpDir, { recursive: true, force: true });
		});

		test("deletes only upload-source rows and preserves files on disk", () => {
			// Soft-delete: rows are removed but the underlying files stay
			// on disk so the user can re-add them or recover them manually.
			fresh();
			const uploadPath = join(tmpDir, "upload.png");
			const pinPath = join(tmpDir, "pin.png");
			const genPath = join(tmpDir, "gen.png");
			writeFileSync(uploadPath, new Uint8Array([1]));
			writeFileSync(pinPath, new Uint8Array([2]));
			writeFileSync(genPath, new Uint8Array([3]));

			insertImage({
				id: "u1",
				filename: "upload.png",
				originalName: "upload.png",
				path: uploadPath,
				mimeType: "image/png",
				size: 1,
				createdAt: "2026-04-18T00:00:00Z",
				source: "upload",
			});
			insertImage({
				id: "p1",
				filename: "pin.png",
				originalName: "pin.png",
				path: pinPath,
				mimeType: "image/png",
				size: 1,
				createdAt: "2026-04-18T00:00:01Z",
				source: "pinterest",
			});
			insertImage({
				id: "g1",
				filename: "gen.png",
				originalName: "gen.png",
				path: genPath,
				mimeType: "image/png",
				size: 1,
				createdAt: "2026-04-18T00:00:02Z",
				source: "generation-copy",
			});

			const result = deleteImagesBySource("upload");
			expect(result.rows).toBe(1);
			expect(result.files).toBe(0);

			expect(getImage("u1")).toBeNull();
			expect(getImage("p1")).not.toBeNull();
			expect(getImage("g1")).not.toBeNull();

			expect(existsSync(uploadPath)).toBe(true);
			expect(existsSync(pinPath)).toBe(true);
			expect(existsSync(genPath)).toBe(true);
		});

		test("returns rows=0 / files=0 when no matching source rows exist", () => {
			fresh();
			insertImage({
				id: "p1",
				filename: "pin.png",
				originalName: "pin.png",
				path: "/nonexistent/pin.png",
				mimeType: "image/png",
				size: 1,
				createdAt: "2026-04-18T00:00:00Z",
				source: "pinterest",
			});
			const result = deleteImagesBySource("upload");
			expect(result.rows).toBe(0);
			expect(result.files).toBe(0);
			expect(getImage("p1")).not.toBeNull();
		});

		test("handles missing files gracefully (row deleted, files=0)", () => {
			fresh();
			insertImage({
				id: "u1",
				filename: "x.png",
				originalName: "x.png",
				path: "/nonexistent/path/xxx.png",
				mimeType: "image/png",
				size: 1,
				createdAt: "2026-04-18T00:00:00Z",
				source: "upload",
			});
			const result = deleteImagesBySource("upload");
			expect(result.rows).toBe(1);
			expect(result.files).toBe(0);
			expect(getImage("u1")).toBeNull();
		});
	});
});
