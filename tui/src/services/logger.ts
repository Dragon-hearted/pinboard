/**
 * Minimal file logger for non-UI service/hook code.
 *
 * Writing to stdout/stderr (console.warn etc.) while the Ink TUI is mounted
 * corrupts the rendered frame, so diagnostics are appended to
 * logs/pinboard.log instead. Best-effort: never throws.
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const LOG_PATH = resolve(import.meta.dir, "../../../logs/pinboard.log");

/** Append a timestamped line to logs/pinboard.log; never throws. */
export function logWarn(line: string): void {
	try {
		const dir = dirname(LOG_PATH);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`);
	} catch {
		// logging is best-effort — never disrupt the caller or the TUI
	}
}
