/**
 * Tracks the active preview index in a generation list while preserving the
 * user's history position. When a fresh generation arrives:
 *   - if the user is at index 0, the index follows the new head;
 *   - otherwise the index is re-mapped to the previously-pinned generation id
 *     so the user keeps viewing the same record.
 * Exposes an `onNewer` callback so callers can flash a status line.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface PinnedGenLike {
	id: string;
}

export interface UsePinnedGenIndexOpts<G extends PinnedGenLike> {
	generations: readonly G[];
	/** Fired when a new head arrives while the user is mid-history. */
	onNewer?: () => void;
}

export interface UsePinnedGenIndexApi {
	genIndex: number;
	pinnedGenId: string | null;
	setGenIndex(next: number | ((prev: number) => number)): void;
	jumpToNewest(): void;
	stepForward(): void;
	stepBack(): void;
}

export function usePinnedGenIndex<G extends PinnedGenLike>(
	opts: UsePinnedGenIndexOpts<G>,
): UsePinnedGenIndexApi {
	const { generations, onNewer } = opts;
	const [genIndex, setGenIndexState] = useState(0);
	const [pinnedGenId, setPinnedGenId] = useState<string | null>(null);

	const onNewerRef = useRef(onNewer);
	useEffect(() => {
		onNewerRef.current = onNewer;
	}, [onNewer]);

	const newestId = generations[0]?.id ?? null;
	const previousNewestRef = useRef<string | null>(null);
	const initialisedRef = useRef(false);

	// Single effect: detect a head shift first and re-anchor `genIndex`
	// synchronously, then derive `pinnedGenId` from the (now-correct) index.
	// Splitting these two into separate effects produces a one-frame window
	// where `pinnedGenId` points at the wrong generation while React schedules
	// the second pass — anything observing it (selection highlight, badges,
	// downstream effects) flickers.
	useEffect(() => {
		const prevNewest = previousNewestRef.current;
		previousNewestRef.current = newestId;

		let resolvedIndex = genIndex;

		if (!initialisedRef.current) {
			initialisedRef.current = true;
		} else if (newestId && newestId !== prevNewest) {
			if (genIndex === 0) {
				// User parked at the head — follow it silently.
				resolvedIndex = 0;
			} else {
				// Mid-history — re-anchor by id and notify the caller.
				if (pinnedGenId) {
					const newIdx = generations.findIndex((g) => g.id === pinnedGenId);
					if (newIdx >= 0) {
						resolvedIndex = newIdx;
						if (newIdx !== genIndex) setGenIndexState(newIdx);
					}
				}
				onNewerRef.current?.();
			}
		}

		const current = generations[resolvedIndex] ?? null;
		const nextPinnedId = current?.id ?? null;
		if (nextPinnedId !== pinnedGenId) {
			setPinnedGenId(nextPinnedId);
		}
	}, [genIndex, generations, newestId, pinnedGenId]);

	const setGenIndex = useCallback(
		(next: number | ((prev: number) => number)) => {
			setGenIndexState((prev) => {
				const candidate = typeof next === "function" ? next(prev) : next;
				if (generations.length === 0) return 0;
				if (candidate < 0) return 0;
				if (candidate >= generations.length) return generations.length - 1;
				return candidate;
			});
		},
		[generations.length],
	);

	const jumpToNewest = useCallback(() => setGenIndex(0), [setGenIndex]);
	const stepForward = useCallback(
		() => setGenIndex((i) => i + 1),
		[setGenIndex],
	);
	const stepBack = useCallback(() => setGenIndex((i) => i - 1), [setGenIndex]);

	return {
		genIndex,
		pinnedGenId,
		setGenIndex,
		jumpToNewest,
		stepForward,
		stepBack,
	};
}
