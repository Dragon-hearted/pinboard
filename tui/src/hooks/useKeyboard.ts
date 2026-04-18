/**
 * Global keyboard dispatcher. Screens pass a keymap via `registerKeymap`;
 * global keys ("?", "q", focus switches) always run. Modal context takes
 * precedence — modals own the keyboard until they close.
 */

import { useInput, useStdin, type Key } from "ink";

export type FocusId = "gallery" | "prompt";
export type ModalId =
	| "model"
	| "pinterest"
	| "help"
	| "add-file"
	| "clear-confirm"
	| null;

export type KeyHandler = (input: string, key: Key) => void;
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

	const { isRawModeSupported } = useStdin();

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

		// Text-capture mode: let the owning input drive, we only handle Esc + Tab.
		if (captureMode) {
			if (key.escape) {
				setFocus("gallery");
				return;
			}
			if (key.tab) {
				onInvalidKey?.(
					"Press Enter to commit, then Tab to switch panes.",
				);
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
		if (input === "X") {
			setModal("clear-confirm");
			return;
		}
		if (key.tab) {
			setFocus(focus === "gallery" ? "prompt" : "gallery");
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
}
