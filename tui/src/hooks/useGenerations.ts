/**
 * Generations state: loads history on mount, exposes `generate()` that runs
 * through `imageengine.generate` and mirrors the result into SQLite.
 */

import { useCallback, useEffect, useState } from "react";
import * as db from "../services/db.ts";
import * as imageengine from "../services/imageengine.ts";
import {
	detectImageExt,
	ensureDownloadsDir,
} from "../services/paths.ts";
import type {
	AspectRatio,
	GenerationRecord,
	GenerationRequest,
	WisGateModel,
} from "../services/types.ts";

export interface GenerateArgs {
	prompt: string;
	modelId: WisGateModel;
	generationRefIds?: string[];
	promptOnlyRefIds?: string[];
	aspectRatio?: AspectRatio;
}

/**
 * Resolve pinboard image ids to inline base64 payloads for ImageEngine.
 * Skips ids whose row is missing or whose file fails to load.
 */
export async function loadReferenceImages(
	ids: string[],
): Promise<Array<{ data: string; mimeType: string }>> {
	const out: Array<{ data: string; mimeType: string }> = [];
	for (const id of ids) {
		const row = db.getImage(id);
		if (!row) {
			console.warn(`[pinboard] ref ${id}: no image row found, skipping`);
			continue;
		}
		try {
			const buf = await Bun.file(row.path).arrayBuffer();
			out.push({
				data: Buffer.from(buf).toString("base64"),
				mimeType: row.mimeType,
			});
		} catch (err) {
			console.warn(
				`[pinboard] ref ${id}: failed to load ${row.path}: ${(err as Error).message}`,
			);
		}
	}
	return out;
}

export interface UseGenerationsApi {
	generations: GenerationRecord[];
	inFlight: boolean;
	lastError: string | null;
	generate(args: GenerateArgs): Promise<GenerationRecord | null>;
	refresh(): void;
	/** Newest generation id, or null if none exist. */
	latestId(): string | null;
}

export function useGenerations(): UseGenerationsApi {
	const [generations, setGenerations] = useState<GenerationRecord[]>([]);
	const [inFlight, setInFlight] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);

	const refresh = useCallback(() => {
		try {
			setGenerations(db.listGenerations());
		} catch (e) {
			setLastError((e as Error).message);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const generate = useCallback(
		async (args: GenerateArgs): Promise<GenerationRecord | null> => {
			setInFlight(true);
			setLastError(null);
			try {
				// Only generation-tagged refs are sent to the model. Prompt-only
				// refs are recorded for audit/UI but never uploaded — see
				// useGenerations.test.ts "ref intent split" for the contract.
				const generationRefIds = args.generationRefIds ?? [];
				const promptOnlyRefIds = args.promptOnlyRefIds ?? [];
				const referenceImages = await loadReferenceImages(generationRefIds);
				const req: GenerationRequest = {
					prompt: args.prompt,
					model: args.modelId,
					referenceImages:
						referenceImages.length > 0 ? referenceImages : undefined,
					...(args.aspectRatio && { aspectRatio: args.aspectRatio }),
				};
				const result = await imageengine.generate(req);

				// ImageEngine returns a URL path (`/api/gallery/:id/image`). Pull the
				// bytes down to `downloads/` so ImageThumb (path-based) can render it.
				const bytes = await imageengine.getImage(result.id);
				const ext = detectImageExt(bytes);
				const downloadPath = `${ensureDownloadsDir()}/${result.id}.${ext}`;
				await Bun.write(downloadPath, bytes);

				const refsPayload =
					args.generationRefIds || args.promptOnlyRefIds
						? JSON.stringify({
								generation: generationRefIds,
								promptOnly: promptOnlyRefIds,
							})
						: JSON.stringify(generationRefIds);

				const record: GenerationRecord = {
					id: result.id,
					prompt: result.prompt,
					model: result.model,
					resultPath: downloadPath,
					referenceImageIds: refsPayload,
					createdAt: result.createdAt,
				};
				try {
					db.insertGeneration(record);
				} catch {
					// duplicate id — ignore, ImageEngine already persisted it
				}
				refresh();
				return record;
			} catch (e) {
				setLastError((e as Error).message);
				return null;
			} finally {
				setInFlight(false);
			}
		},
		[refresh],
	);

	const latestId = useCallback(
		(): string | null => generations[0]?.id ?? null,
		[generations],
	);

	return { generations, inFlight, lastError, generate, refresh, latestId };
}
