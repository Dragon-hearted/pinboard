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
}

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
	} = opts;

	const { isRawModeSupported } = useStdin();

	useInput(
		(input, key) => {
		// Modal layer: only its own keymap + Escape respond.
		if (modal) {
			if (key.escape) {
				setModal(null);
				return;
			}
			if (modal === "help" && input === "?") {
				setModal(null);
				return;
			}
			modalKeymap?.[input]?.(input, key);
			return;
		}

		// Text-capture mode: let the owning input drive, we only handle Esc + Tab.
		if (captureMode) {
			if (key.escape) {
				setFocus("gallery");
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
		if (key.tab) {
			setFocus(focus === "gallery" ? "prompt" : "gallery");
			return;
		}

			// Delegate to the focused pane's keymap.
			paneKeymap?.[input]?.(input, key);
		},
		{ isActive: isRawModeSupported === true },
	);
}
