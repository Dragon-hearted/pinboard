/**
 * Ensures ImageEngine is reachable on mount and polls `/api/budget` every 10s.
 */

import { useEffect, useRef, useState } from "react";
import * as imageengine from "../services/imageengine.ts";
import type { BudgetStatus } from "../services/types.ts";

export type EngineStatus = "starting" | "up" | "down";

export interface UseImageEngineApi {
	status: EngineStatus;
	budget: BudgetStatus | null;
	lastError: string | null;
}

const BUDGET_POLL_MS = 10_000;

export function useImageEngine(): UseImageEngineApi {
	const [status, setStatus] = useState<EngineStatus>("starting");
	const [budget, setBudget] = useState<BudgetStatus | null>(null);
	const [lastError, setLastError] = useState<string | null>(null);
	const aliveRef = useRef(true);

	useEffect(() => {
		aliveRef.current = true;
		let cancelled = false;

		const refreshBudget = async () => {
			try {
				const b = await imageengine.getBudget();
				if (cancelled) return;
				setBudget(b);
			} catch (e) {
				if (cancelled) return;
				setLastError((e as Error).message);
			}
		};

		(async () => {
			try {
				await imageengine.ensureUp({ silent: true });
				if (cancelled) return;
				setStatus("up");
				await refreshBudget();
			} catch (e) {
				if (cancelled) return;
				setStatus("down");
				setLastError((e as Error).message);
			}
		})();

		const timer = setInterval(async () => {
			if (cancelled) return;
			const ok = await imageengine.healthCheck();
			if (cancelled) return;
			setStatus(ok ? "up" : "down");
			if (ok) await refreshBudget();
		}, BUDGET_POLL_MS);

		return () => {
			cancelled = true;
			aliveRef.current = false;
			clearInterval(timer);
		};
	}, []);

	return { status, budget, lastError };
}
