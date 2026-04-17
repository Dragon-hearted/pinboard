/**
 * Manages the reference gallery (images + generation copies) backed by SQLite.
 * Exposes add/remove/select helpers plus `getAtTag(n)` for @N prompt refs.
 */

import { useCallback, useEffect, useState } from "react";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import * as db from "../services/db.ts";
import * as pinterest from "../services/pinterest.ts";
import * as imageengine from "../services/imageengine.ts";
import type { ImageRecord } from "../services/types.ts";

const UPLOADS_DIR = resolve(import.meta.dir, "../../../uploads");

const EXT_MIME: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
};

function ensureUploadsDir(): string {
	if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
	return UPLOADS_DIR;
}

export interface UseReferencesApi {
	references: ImageRecord[];
	selectedIndex: number;
	loading: boolean;
	error: string | null;
	select(i: number): void;
	selectDelta(delta: number): void;
	refresh(): void;
	addFromFile(path: string): Promise<ImageRecord>;
	addFromPinterest(url: string): Promise<ImageRecord>;
	addFromGeneration(genId: string): Promise<ImageRecord>;
	remove(id: string): void;
	getAtTag(n: number): ImageRecord | null;
}

export function useReferences(): UseReferencesApi {
	const [references, setReferences] = useState<ImageRecord[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(() => {
		try {
			const rows = db.listImages();
			setReferences(rows);
			setSelectedIndex((i) => Math.min(i, Math.max(0, rows.length - 1)));
			setError(null);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const select = useCallback((i: number) => {
		setSelectedIndex((prev) => {
			if (i < 0) return 0;
			return i;
		});
	}, []);

	const selectDelta = useCallback(
		(delta: number) => {
			setSelectedIndex((prev) => {
				const next = prev + delta;
				if (references.length === 0) return 0;
				if (next < 0) return 0;
				if (next >= references.length) return references.length - 1;
				return next;
			});
		},
		[references.length],
	);

	const addFromFile = useCallback(
		async (path: string): Promise<ImageRecord> => {
			const src = resolve(path);
			if (!existsSync(src)) throw new Error(`File not found: ${src}`);
			const stat = statSync(src);
			const ext = extname(src).slice(1).toLowerCase() || "png";
			const mime = EXT_MIME[ext] ?? `image/${ext}`;
			const id = randomUUID();
			const dir = ensureUploadsDir();
			const filename = `${id}.${ext}`;
			const dest = `${dir}/${filename}`;
			copyFileSync(src, dest);

			const record: ImageRecord = {
				id,
				filename,
				originalName: basename(src),
				path: dest,
				mimeType: mime,
				size: stat.size,
				createdAt: new Date().toISOString(),
				source: "upload",
				sourceUrl: null,
			};
			db.insertImage(record);
			refresh();
			return record;
		},
		[refresh],
	);

	const addFromPinterest = useCallback(
		async (url: string): Promise<ImageRecord> => {
			const dir = ensureUploadsDir();
			const record = await pinterest.importToDb(url, {
				uploadsDir: dir,
				insertImage: db.insertImage,
			});
			refresh();
			return record;
		},
		[refresh],
	);

	const addFromGeneration = useCallback(
		async (genId: string): Promise<ImageRecord> => {
			// Generation rows are already mirror-inserted into `images` by
			// `db.insertGeneration`. If caller wants to pull a base64 copy from
			// ImageEngine (e.g. for a generation not yet mirrored), ask the service.
			const existing = db.getImage(genId);
			if (existing) {
				refresh();
				return existing;
			}
			const payload = await imageengine.useAsReference(genId);
			const ext = payload.mimeType.split("/")[1] ?? "png";
			const id = randomUUID();
			const dir = ensureUploadsDir();
			const filename = `${id}.${ext}`;
			const dest = `${dir}/${filename}`;
			await Bun.write(dest, Buffer.from(payload.data, "base64"));
			const record: ImageRecord = {
				id,
				filename,
				originalName: `generation-${genId}.${ext}`,
				path: dest,
				mimeType: payload.mimeType,
				size: Bun.file(dest).size ?? 0,
				createdAt: new Date().toISOString(),
				source: "generation-copy",
				sourceUrl: null,
			};
			db.insertImage(record);
			refresh();
			return record;
		},
		[refresh],
	);

	const remove = useCallback(
		(id: string) => {
			db.deleteImage(id);
			refresh();
		},
		[refresh],
	);

	const getAtTag = useCallback(
		(n: number): ImageRecord | null => {
			if (n < 1 || n > references.length) return null;
			return references[n - 1] ?? null;
		},
		[references],
	);

	return {
		references,
		selectedIndex,
		loading,
		error,
		select,
		selectDelta,
		refresh,
		addFromFile,
		addFromPinterest,
		addFromGeneration,
		remove,
		getAtTag,
	};
}
