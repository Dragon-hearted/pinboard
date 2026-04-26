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

/**
 * Re-runs whenever `reloadToken` changes. Pair with `claudevision.__resetProbeCache()`
 * in the reload-tools flow so the StatusBar reflects the freshly-probed CLI
 * instead of the stale cached probe from mount.
 */
export function useVisionStatus(reloadToken = 0): UseVisionStatusApi {
	const [status, setStatus] = useState<VisionStatus>("checking");
	const [reason, setReason] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setStatus("checking");
		setReason(null);
		(async () => {
			try {
				const probe = await claudevision.probeAtStartup();
				if (cancelled) return;
				if (!probe.available) {
					setStatus("unavailable");
					setReason("claude CLI not on PATH");
					return;
				}
				// `imageAttachFlag` always resolves once the binary is present —
				// `probeClaudeCli` falls back to "@path" (Claude Code's universal
				// in-prompt file-reference syntax) when --help omits explicit flags.
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
	}, [reloadToken]);

	return { status, reason };
}
