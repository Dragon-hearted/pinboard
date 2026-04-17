import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	__resetDb,
	deleteImage,
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

	test("insertGeneration mirrors a row into images table", () => {
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
		const mirror = getImage("gen-1");
		expect(mirror).not.toBeNull();
		expect(mirror?.source).toBe("generation-copy");
		expect(mirror?.path).toBe("/tmp/gen-1.png");
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
});
