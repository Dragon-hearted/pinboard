/**
 * Ensures ImageEngine is reachable on mount and polls `/api/budget` every 10s.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as imageengine from "../services/imageengine.ts";
import type { BudgetStatus } from "../services/types.ts";

export type EngineStatus = "starting" | "up" | "down";

export interface UseImageEngineApi {
	status: EngineStatus;
	budget: BudgetStatus | null;
	lastError: string | null;
	refreshBudget(): Promise<void>;
}

const BUDGET_POLL_MS = 10_000;

export function useImageEngine(): UseImageEngineApi {
	const [status, setStatus] = useState<EngineStatus>("starting");
	const [budget, setBudget] = useState<BudgetStatus | null>(null);
	const [lastError, setLastError] = useState<string | null>(null);
	const aliveRef = useRef(true);

	const refreshBudget = useCallback(async () => {
		try {
			const b = await imageengine.getBudget();
			if (!aliveRef.current) return;
			setBudget(b);
		} catch (e) {
			if (!aliveRef.current) return;
			setLastError((e as Error).message);
		}
	}, []);

	useEffect(() => {
		aliveRef.current = true;

		(async () => {
			try {
				await imageengine.ensureUp({ silent: true });
				if (!aliveRef.current) return;
				setStatus("up");
				await refreshBudget();
			} catch (e) {
				if (!aliveRef.current) return;
				setStatus("down");
				setLastError((e as Error).message);
			}
		})();

		const timer = setInterval(async () => {
			if (!aliveRef.current) return;
			const ok = await imageengine.healthCheck();
			if (!aliveRef.current) return;
			setStatus(ok ? "up" : "down");
			if (ok) await refreshBudget();
		}, BUDGET_POLL_MS);

		return () => {
			aliveRef.current = false;
			clearInterval(timer);
		};
	}, [refreshBudget]);

	return { status, budget, lastError, refreshBudget };
}
