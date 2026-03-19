import { Database } from "bun:sqlite";
import type { ImageRecord, GenerationRecord } from "./types";

const db = new Database("./pinboard.db", { create: true });

// Enable WAL mode for better concurrent access
db.exec("PRAGMA journal_mode = WAL;");

// Create tables
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

// Image helpers
export function insertImage(image: ImageRecord): void {
  const stmt = db.prepare(
    "INSERT INTO images (id, filename, originalName, path, mimeType, size, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run(
    image.id,
    image.filename,
    image.originalName,
    image.path,
    image.mimeType,
    image.size,
    image.createdAt
  );
}

export function getImage(id: string): ImageRecord | null {
  const stmt = db.prepare("SELECT * FROM images WHERE id = ?");
  return (stmt.get(id) as ImageRecord) ?? null;
}

export function getAllImages(): ImageRecord[] {
  const stmt = db.prepare("SELECT * FROM images ORDER BY createdAt DESC");
  return stmt.all() as ImageRecord[];
}

export function deleteImage(id: string): void {
  const stmt = db.prepare("DELETE FROM images WHERE id = ?");
  stmt.run(id);
}

// Generation helpers
export function insertGeneration(generation: GenerationRecord): void {
  const stmt = db.prepare(
    "INSERT INTO generations (id, prompt, model, resultPath, referenceImageIds, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(
    generation.id,
    generation.prompt,
    generation.model,
    generation.resultPath,
    generation.referenceImageIds,
    generation.createdAt
  );
}

export function getGeneration(id: string): GenerationRecord | null {
  const stmt = db.prepare("SELECT * FROM generations WHERE id = ?");
  return (stmt.get(id) as GenerationRecord) ?? null;
}

export function getAllGenerations(): GenerationRecord[] {
  const stmt = db.prepare(
    "SELECT * FROM generations ORDER BY createdAt DESC"
  );
  return stmt.all() as GenerationRecord[];
}

export { db };
