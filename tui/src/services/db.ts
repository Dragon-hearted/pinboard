/**
 * SQLite wrapper for Pinboard TUI.
 * Preserves the existing `pinboard.db` schema from `systems/pinboard/server/src/db.ts`
 * and runs idempotent migrations (adds `source`, `sourceUrl`) on startup.
 */

import { Database } from "bun:sqlite";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import type { GenerationRecord, ImageRecord } from "./types";

const UPLOADS_DIR = resolve(import.meta.dir, "../../../uploads");

const DEFAULT_DB_PATH = resolve(
	import.meta.dir,
	"../../../pinboard.db",
);

const MIGRATION_FILES = [
	resolve(import.meta.dir, "../migrations/001_add_source_column.sql"),
];

let sharedDb: Database | null = null;

interface PragmaColumn {
	cid: number;
	name: string;
	type: string;
	notnull: number;
	dflt_value: unknown;
	pk: number;
}

function ensureTables(db: Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS images (
			id TEXT PRIMARY KEY,
			filename TEXT NOT NULL,
			originalName TEXT NOT NULL,
			path TEXT NOT NULL,
			mimeType TEXT NOT NULL,
			size INTEGER NOT NULL,
			createdAt TEXT NOT NULL
		)
	`);
	db.exec(`
		CREATE TABLE IF NOT EXISTS generations (
			id TEXT PRIMARY KEY,
			prompt TEXT NOT NULL,
			model TEXT NOT NULL,
			resultPath TEXT NOT NULL,
			referenceImageIds TEXT NOT NULL,
			createdAt TEXT NOT NULL
		)
	`);
}

function runMigrations(db: Database): void {
	const cols = (
		db.prepare("PRAGMA table_info(images)").all() as PragmaColumn[]
	).map((c) => c.name);
	if (!cols.includes("source")) {
		db.exec(
			"ALTER TABLE images ADD COLUMN source TEXT DEFAULT 'upload'",
		);
	}
	if (!cols.includes("sourceUrl")) {
		db.exec("ALTER TABLE images ADD COLUMN sourceUrl TEXT");
	}
}

/**
 * Open the Pinboard SQLite database, enable WAL, create tables if missing,
 * and run idempotent migrations. Pass `":memory:"` for tests.
 */
export function initDb(path: string = DEFAULT_DB_PATH): Database {
	const db = new Database(path, { create: true });
	db.exec("PRAGMA journal_mode = WAL;");
	ensureTables(db);
	runMigrations(db);
	sharedDb = db;
	return db;
}

function db(): Database {
	if (!sharedDb) sharedDb = initDb();
	return sharedDb;
}

/** For tests: drop the cached handle so the next call re-initialises. */
export function __resetDb(): void {
	sharedDb?.close();
	sharedDb = null;
}

/** Insert a new image row. `source` defaults to 'upload' when omitted. */
export function insertImage(record: ImageRecord): void {
	db()
		.prepare(
			`INSERT INTO images (id, filename, originalName, path, mimeType, size, createdAt, source, sourceUrl)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			record.id,
			record.filename,
			record.originalName,
			record.path,
			record.mimeType,
			record.size,
			record.createdAt,
			record.source ?? "upload",
			record.sourceUrl ?? null,
		);
}

/**
 * Insert a generation row and mirror it into `images` so the file can be
 * served by any code that reads the images table (preserves old server behaviour).
 */
export function insertGeneration(record: GenerationRecord): void {
	const d = db();
	d.prepare(
		`INSERT INTO generations (id, prompt, model, resultPath, referenceImageIds, createdAt)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	).run(
		record.id,
		record.prompt,
		record.model,
		record.resultPath,
		record.referenceImageIds,
		record.createdAt,
	);

	const ext = record.resultPath.split(".").pop() || "png";
	const filename = record.resultPath.split("/").pop() || `${record.id}.${ext}`;
	const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
	let size = 0;
	try {
		size = Bun.file(record.resultPath).size ?? 0;
	} catch {
		size = 0;
	}

	d.prepare(
		`INSERT OR IGNORE INTO images (id, filename, originalName, path, mimeType, size, createdAt, source, sourceUrl)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 'generation-copy', NULL)`,
	).run(
		record.id,
		filename,
		`generated-${record.id}.${ext}`,
		record.resultPath,
		mimeType,
		size,
		record.createdAt,
	);
}

/** List all images newest-first. */
export function listImages(): ImageRecord[] {
	return db()
		.prepare("SELECT * FROM images ORDER BY createdAt DESC")
		.all() as ImageRecord[];
}

/** List all generations newest-first. */
export function listGenerations(): GenerationRecord[] {
	return db()
		.prepare("SELECT * FROM generations ORDER BY createdAt DESC")
		.all() as GenerationRecord[];
}

/** Fetch a single image by id, or null. */
export function getImage(id: string): ImageRecord | null {
	return (
		(db()
			.prepare("SELECT * FROM images WHERE id = ?")
			.get(id) as ImageRecord | undefined) ?? null
	);
}

/** Fetch a single generation by id, or null. */
export function getGeneration(id: string): GenerationRecord | null {
	return (
		(db()
			.prepare("SELECT * FROM generations WHERE id = ?")
			.get(id) as GenerationRecord | undefined) ?? null
	);
}

/** Delete an image row and unlink its backing file if it exists on disk. */
export function deleteImage(id: string): void {
	const d = db();
	const row = d.prepare("SELECT path FROM images WHERE id = ?").get(id) as
		| { path: string }
		| undefined;
	d.prepare("DELETE FROM images WHERE id = ?").run(id);
	if (row?.path && existsSync(row.path)) {
		try {
			unlinkSync(row.path);
		} catch {
			// filesystem already moved/removed — ignore
		}
	}
}

/**
 * Delete every row in `images` and unlink each backing file. Returns the number
 * of disk files actually removed (path existed and unlink succeeded).
 */
export function deleteAllImages(): { rows: number; files: number } {
	const d = db();
	const rows = d.prepare("SELECT path FROM images").all() as { path: string }[];
	let files = 0;
	for (const r of rows) {
		if (r.path && existsSync(r.path)) {
			try {
				unlinkSync(r.path);
				files += 1;
			} catch {
				// already gone — ignore
			}
		}
	}
	d.exec("DELETE FROM images");
	return { rows: rows.length, files };
}

/**
 * Delete every row in `generations` and unlink each `resultPath`. Mirrored
 * `images` rows for generations are removed by `deleteAllImages` separately.
 */
export function deleteAllGenerations(): { rows: number; files: number } {
	const d = db();
	const rows = d
		.prepare("SELECT resultPath FROM generations")
		.all() as { resultPath: string }[];
	let files = 0;
	for (const r of rows) {
		if (r.resultPath && existsSync(r.resultPath)) {
			try {
				unlinkSync(r.resultPath);
				files += 1;
			} catch {
				// already gone — ignore
			}
		}
	}
	d.exec("DELETE FROM generations");
	return { rows: rows.length, files };
}

/** Sweep orphan files in the uploads dir that no `images` row references. */
export function purgeUploadOrphans(): number {
	if (!existsSync(UPLOADS_DIR)) return 0;
	let removed = 0;
	for (const name of readdirSync(UPLOADS_DIR)) {
		const full = `${UPLOADS_DIR}/${name}`;
		try {
			unlinkSync(full);
			removed += 1;
		} catch {
			// permission / dir entry — ignore
		}
	}
	return removed;
}

// Exported for external test access to migration SQL path.
export { MIGRATION_FILES, DEFAULT_DB_PATH };
