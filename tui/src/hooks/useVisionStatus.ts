/**
 * Probes the local `claude` CLI exactly once on mount and reports whether the
 * vision flows (`v` / `w`) will succeed. Surfaces a human-readable failure
 * reason when the binary is missing or lacks an image-attach flag.
 */

import { useEffect, useState } from "react";
import * as claudevision from "../services/claudevision.ts";

export type VisionStatus = "checking" | "ready" | "unavailable";

export interface UseVisionStatusApi {
	status: VisionStatus;
	reason: string | null;
}

export function useVisionStatus(): UseVisionStatusApi {
	const [status, setStatus] = useState<VisionStatus>("checking");
	const [reason, setReason] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const probe = await claudevision.probeAtStartup();
				if (cancelled) return;
				if (!probe.available) {
					setStatus("unavailable");
					setReason("claude CLI not on PATH");
					return;
				}
				if (!probe.imageAttachFlag) {
					setStatus("unavailable");
					setReason(
						"claude CLI is installed but no supported image-attach flag detected",
					);
					return;
				}
				setStatus("ready");
				setReason(null);
			} catch (e) {
				if (cancelled) return;
				setStatus("unavailable");
				setReason((e as Error).message);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return { status, reason };
}
