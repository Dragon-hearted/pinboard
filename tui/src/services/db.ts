/**
 * SQLite wrapper for Pinboard TUI.
 * Preserves the existing `pinboard.db` schema from `systems/pinboard/server/src/db.ts`
 * and runs idempotent migrations (adds `source`, `sourceUrl`) on startup.
 */

import { Database } from "bun:sqlite";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { DOWNLOADS_DIR, UPLOADS_DIR } from "./paths";
import type { GenerationRecord, ImageRecord, ImageSource } from "./types";

const DEFAULT_DB_PATH = resolve(
	import.meta.dir,
	"../../../pinboard.db",
);

// Migration `.sql` files in tui/src/migrations/ are documentary only — the
// runner inlines the equivalent statements below so a stripped/bundled
// distribution still applies them without depending on the source tree.
const MIGRATION_FILES = [
	resolve(import.meta.dir, "../migrations/001_add_source_column.sql"),
	resolve(import.meta.dir, "../migrations/002_drop_generation_copies.sql"),
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
	// 002: clear stale generation-copy mirror rows. Idempotent — runs every
	// boot. Inlined (parallels 001) so bundled distributions don't silently
	// no-op when the documentary .sql file is absent from disk.
	db.exec("DELETE FROM images WHERE source = 'generation-copy'");
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
 * Insert a generation row. The gallery (`images` table) intentionally does NOT
 * mirror generations — the user opts in via the `u` hotkey, which copies the
 * latest generation file into uploads/ and inserts a regular `upload` row.
 */
export function insertGeneration(record: GenerationRecord): void {
	db()
		.prepare(
			`INSERT INTO generations (id, prompt, model, resultPath, referenceImageIds, createdAt)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.run(
			record.id,
			record.prompt,
			record.model,
			record.resultPath,
			record.referenceImageIds,
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

/**
 * Delete an image row from the gallery. The backing file under uploads/ is
 * preserved on disk — gallery deletion is a soft-delete by design so the user
 * can re-add the same file or recover it manually.
 */
export function deleteImage(id: string): void {
	db().prepare("DELETE FROM images WHERE id = ?").run(id);
}

/**
 * Soft-delete every row in `images`. Backing files under uploads/ are NOT
 * unlinked — gallery clearing is purely about the table state. Use
 * `purgeUploadOrphans` for an explicit disk sweep.
 */
export function deleteAllImages(): { rows: number; files: number } {
	const d = db();
	const rows = (d.prepare("SELECT id FROM images").all() as { id: string }[])
		.length;
	d.exec("DELETE FROM images");
	return { rows, files: 0 };
}

/**
 * Soft-delete `images` rows matching `source`. Backing files are preserved.
 */
export function deleteImagesBySource(
	source: ImageSource,
): { rows: number; files: number } {
	const d = db();
	const rows = (
		d.prepare("SELECT id FROM images WHERE source = ?").all(source) as {
			id: string;
		}[]
	).length;
	d.prepare("DELETE FROM images WHERE source = ?").run(source);
	return { rows, files: 0 };
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

/** Sweep orphan files in the downloads dir (generated images cache). */
export function purgeDownloadOrphans(): number {
	if (!existsSync(DOWNLOADS_DIR)) return 0;
	let removed = 0;
	for (const name of readdirSync(DOWNLOADS_DIR)) {
		const full = `${DOWNLOADS_DIR}/${name}`;
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
