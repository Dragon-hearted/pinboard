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

	// Update the pinnedGenId whenever the user explicitly moves the index.
	useEffect(() => {
		const current = generations[genIndex] ?? null;
		setPinnedGenId(current?.id ?? null);
	}, [genIndex, generations]);

	const newestId = generations[0]?.id ?? null;
	const previousNewestRef = useRef<string | null>(null);
	const initialisedRef = useRef(false);

	useEffect(() => {
		const prev = previousNewestRef.current;
		previousNewestRef.current = newestId;
		if (!initialisedRef.current) {
			initialisedRef.current = true;
			return;
		}
		if (newestId === prev) return;
		if (!newestId) return;

		if (genIndex === 0) {
			setPinnedGenId(newestId);
			return;
		}
		// Mid-history: re-anchor to the same generation by id so the user's
		// view stays on the record they were inspecting.
		if (pinnedGenId) {
			const newIdx = generations.findIndex((g) => g.id === pinnedGenId);
			if (newIdx >= 0 && newIdx !== genIndex) {
				setGenIndexState(newIdx);
			}
		}
		onNewerRef.current?.();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newestId]);

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
