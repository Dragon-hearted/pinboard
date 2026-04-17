/**
 * Generations state: loads history on mount, exposes `generate()` that runs
 * through `imageengine.generate` and mirrors the result into SQLite.
 */

import { useCallback, useEffect, useState } from "react";
import * as db from "../services/db.ts";
import * as imageengine from "../services/imageengine.ts";
import type {
	GenerationRecord,
	GenerationRequest,
	WisGateModel,
} from "../services/types.ts";

export interface GenerateArgs {
	prompt: string;
	modelId: WisGateModel;
	generationRefIds?: string[];
	promptOnlyRefIds?: string[];
}

export interface UseGenerationsApi {
	generations: GenerationRecord[];
	inFlight: boolean;
	lastError: string | null;
	generate(args: GenerateArgs): Promise<GenerationRecord | null>;
	refresh(): void;
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
				const combined = [
					...(args.generationRefIds ?? []),
					...(args.promptOnlyRefIds ?? []),
				];
				const req: GenerationRequest = {
					prompt: args.prompt,
					model: args.modelId,
					referenceImageIds: combined.length > 0 ? combined : undefined,
				};
				const result = await imageengine.generate(req);

				const refsPayload =
					args.generationRefIds || args.promptOnlyRefIds
						? JSON.stringify({
								generation: args.generationRefIds ?? [],
								promptOnly: args.promptOnlyRefIds ?? [],
							})
						: JSON.stringify(combined);

				const record: GenerationRecord = {
					id: result.id,
					prompt: result.prompt,
					model: result.model,
					resultPath: result.imageUrl,
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

	return { generations, inFlight, lastError, generate, refresh };
}
