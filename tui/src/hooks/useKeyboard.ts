/**
 * Global keyboard dispatcher. Screens pass a keymap via `registerKeymap`;
 * global keys ("?", "q", focus switches) always run. Modal context takes
 * precedence — modals own the keyboard until they close.
 */

import { useEffect, useRef } from "react";
import { useInput, useStdin, type Key } from "ink";

export type FocusId = "gallery" | "prompt" | "preview";

const FOCUS_CYCLE: FocusId[] = ["gallery", "prompt", "preview"];

function nextFocus(current: FocusId): FocusId {
	const i = FOCUS_CYCLE.indexOf(current);
	const next = (i + 1) % FOCUS_CYCLE.length;
	return FOCUS_CYCLE[next] ?? "gallery";
}
export type ModalId =
	| "model"
	| "pinterest"
	| "help"
	| "add-file"
	| "clear-confirm"
	| "aspect-ratio"
	| null;

export type KeyHandler = (input: string, key: Key) => void;

/**
 * Sentinel keys for non-printable bindings. Use these as keys in a `Keymap`
 * record alongside printable characters (e.g. `j`, `k`):
 *   `__arrowUp__`, `__arrowDown__`, `__arrowLeft__`, `__arrowRight__`
 *   `__home__`, `__end__`, `__pageUp__`, `__pageDown__`
 */
export const KEY_SENTINELS = {
	arrowUp: "__arrowUp__",
	arrowDown: "__arrowDown__",
	arrowLeft: "__arrowLeft__",
	arrowRight: "__arrowRight__",
	home: "__home__",
	end: "__end__",
	pageUp: "__pageUp__",
	pageDown: "__pageDown__",
} as const;

export type Keymap = Record<string, KeyHandler>;

export interface UseKeyboardOpts {
	focus: FocusId;
	modal: ModalId;
	setFocus(f: FocusId): void;
	setModal(m: ModalId): void;
	quit(): void;
	/** Keymap for the currently focused pane when no modal is open. */
	paneKeymap?: Keymap;
	/** Keymap for the currently open modal (overrides pane). */
	modalKeymap?: Keymap;
	/** Disable pane/global keys — e.g., while text input is active. */
	captureMode?: boolean;
	/** Called when the user presses a key with no binding in the current mode. */
	onInvalidKey?(reason: string): void;
}

const PRINTABLE = /^[\x20-\x7e]$/;

export function useKeyboard(opts: UseKeyboardOpts): void {
	const {
		focus,
		modal,
		setFocus,
		setModal,
		quit,
		paneKeymap,
		modalKeymap,
		captureMode,
		onInvalidKey,
	} = opts;

	const { stdin, isRawModeSupported } = useStdin();

	const paneKeymapRef = useRef(paneKeymap);
	const captureModeRef = useRef(captureMode);
	const modalRef = useRef(modal);
	useEffect(() => {
		paneKeymapRef.current = paneKeymap;
	}, [paneKeymap]);
	useEffect(() => {
		captureModeRef.current = captureMode;
	}, [captureMode]);
	useEffect(() => {
		modalRef.current = modal;
	}, [modal]);

	useInput(
		(input, key) => {
		// Modal layer: only its own keymap + Escape respond.
		if (modal) {
			if (key.escape) {
				setModal(null);
				// Reset focus so we don't land back in a stale prompt captureMode.
				setFocus("gallery");
				return;
			}
			if (modal === "help" && input === "?") {
				setModal(null);
				setFocus("gallery");
				return;
			}
			modalKeymap?.[input]?.(input, key);
			return;
		}

		// Text-capture mode: editor owns printable + arrow + backspace + Enter.
		// We still surface Esc (exit), Tab (focus cycle), and Ctrl-chords so
		// global keys like Ctrl+C reach `quit` and pane Ctrl-chords still fire.
		if (captureMode) {
			if (key.escape) {
				setFocus("gallery");
				return;
			}
			if (key.tab) {
				setFocus(nextFocus(focus));
				return;
			}
			if (key.ctrl) {
				if (input === "c") {
					quit();
					return;
				}
				const handler = paneKeymap?.[input];
				if (handler) {
					handler(input, key);
				}
				return;
			}
			return;
		}

		// Global keys.
		if (input === "q" || (key.ctrl && input === "c")) {
			quit();
			return;
		}
		if (input === "?") {
			setModal("help");
			return;
		}
		if (input === "m") {
			setModal("model");
			return;
		}
		if (input === "p") {
			setModal("pinterest");
			return;
		}
		if (input === "a") {
			setModal("add-file");
			return;
		}
		if (input === "r") {
			setModal("aspect-ratio");
			return;
		}
		if (input === "x" || input === "X") {
			setModal("clear-confirm");
			return;
		}
		if (key.tab) {
			setFocus(nextFocus(focus));
			return;
		}

			// Named-key dispatch: arrows + pageUp/pageDown route through the
			// keymap when the focused pane has registered a sentinel handler.
			const namedKey =
				key.upArrow
					? KEY_SENTINELS.arrowUp
					: key.downArrow
						? KEY_SENTINELS.arrowDown
						: key.leftArrow
							? KEY_SENTINELS.arrowLeft
							: key.rightArrow
								? KEY_SENTINELS.arrowRight
								: key.pageUp
									? KEY_SENTINELS.pageUp
									: key.pageDown
										? KEY_SENTINELS.pageDown
										: null;
			if (namedKey) {
				const namedHandler = paneKeymap?.[namedKey];
				if (namedHandler) {
					namedHandler(input, key);
				}
				return;
			}

			// Delegate to the focused pane's keymap.
			const handler = paneKeymap?.[input];
			if (handler) {
				handler(input, key);
				return;
			}
			// Surface a hint for printable, unmapped keys (skip arrows / ctrl / meta).
			if (
				input &&
				PRINTABLE.test(input) &&
				!key.ctrl &&
				!key.meta &&
				!key.upArrow &&
				!key.downArrow &&
				!key.leftArrow &&
				!key.rightArrow
			) {
				onInvalidKey?.(`Unknown key '${input}'. Press ? for help.`);
			}
		},
		{ isActive: isRawModeSupported === true },
	);

	// Home/End escape sequences: ink's `useInput` doesn't surface them.
	// Tap the raw stdin so panes can bind via `KEY_SENTINELS.home`/`end`.
	useEffect(() => {
		if (!isRawModeSupported || !stdin) return;
		const handler = (chunk: Buffer | string) => {
			if (modalRef.current || captureModeRef.current) return;
			const s = typeof chunk === "string" ? chunk : chunk.toString("utf8");
			const sentinel =
				s === "\x1b[H" || s === "\x1bOH" || s === "\x1b[1~" || s === "\x1b[7~"
					? KEY_SENTINELS.home
					: s === "\x1b[F" ||
							s === "\x1bOF" ||
							s === "\x1b[4~" ||
							s === "\x1b[8~"
						? KEY_SENTINELS.end
						: null;
			if (!sentinel) return;
			const km = paneKeymapRef.current;
			km?.[sentinel]?.(s, {} as Key);
		};
		stdin.on("data", handler);
		return () => {
			stdin.off("data", handler);
		};
	}, [isRawModeSupported, stdin]);
}
