import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { MultilineEditor } from "./MultilineEditor.tsx";

const tick = () => new Promise<void>((r) => setImmediate(r));

interface State {
	change: string[];
	submit: string[];
	cancel: number;
}

function mount(defaultValue = "") {
	const state: State = { change: [], submit: [], cancel: 0 };
	const ui = render(
		React.createElement(MultilineEditor, {
			defaultValue,
			focused: true,
			onChange: (v: string) => state.change.push(v),
			onSubmit: (v: string) => state.submit.push(v),
			onCancel: () => {
				state.cancel += 1;
			},
		}),
	);
	return { state, ui };
}

const lastChange = (s: State) => s.change[s.change.length - 1] ?? "";

const ARROW_UP = "\x1b[A";
const ARROW_RIGHT = "\x1b[C";
const HOME = "\x1b[H";
const END = "\x1b[F";
const ESC = "\x1b";
const ENTER = "\r";
const SHIFT_ENTER = "\x1b\r";
// Portable newline chord — Ctrl+J transmits LF (0x0a) on every VT terminal.
const CTRL_J = "\n";
// readline-style backspace is 0x7f
const BACKSPACE = "\x7f";
// ASCII delete-forward — most terminals send CSI 3~
const DELETE_FORWARD = "\x1b[3~";
const CTRL_A = "\x01";
const CTRL_E = "\x05";
const CTRL_K = "\x0b";
const CTRL_U = "\x15";

describe("MultilineEditor", () => {
	test("typing 'ab\\nc', arrow-up, Home, type 'X' yields 'Xab\\nc'", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("a");
			await tick();
			ui.stdin.write("b");
			await tick();
			ui.stdin.write(SHIFT_ENTER);
			await tick();
			ui.stdin.write("c");
			await tick();
			ui.stdin.write(ARROW_UP);
			await tick();
			ui.stdin.write(HOME);
			await tick();
			ui.stdin.write("X");
			await tick();
			expect(lastChange(state)).toBe("Xab\nc");
		} finally {
			ui.unmount();
		}
	});

	test("Backspace removes the character before the cursor and joins lines", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("ab");
			await tick();
			ui.stdin.write(BACKSPACE);
			await tick();
			expect(lastChange(state)).toBe("a");
			ui.stdin.write(SHIFT_ENTER);
			await tick();
			expect(lastChange(state)).toBe("a\n");
			ui.stdin.write(BACKSPACE);
			await tick();
			expect(lastChange(state)).toBe("a");
		} finally {
			ui.unmount();
		}
	});

	test("Shift+Enter inserts a newline; Enter submits the buffer", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("ab");
			await tick();
			ui.stdin.write(SHIFT_ENTER);
			await tick();
			ui.stdin.write("c");
			await tick();
			expect(lastChange(state)).toBe("ab\nc");
			ui.stdin.write(ENTER);
			await tick();
			expect(state.submit).toContain("ab\nc");
		} finally {
			ui.unmount();
		}
	});

	test("Ctrl+A and Ctrl+E move to start/end of line", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("hello");
			await tick();
			ui.stdin.write(CTRL_A);
			await tick();
			ui.stdin.write("X");
			await tick();
			expect(lastChange(state)).toBe("Xhello");
			ui.stdin.write(CTRL_E);
			await tick();
			ui.stdin.write("Y");
			await tick();
			expect(lastChange(state)).toBe("XhelloY");
		} finally {
			ui.unmount();
		}
	});

	test("Ctrl+K kills to end of line; Ctrl+U kills to start of line", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("abcdef");
			await tick();
			ui.stdin.write(CTRL_A);
			await tick();
			ui.stdin.write(ARROW_RIGHT);
			await tick();
			ui.stdin.write(ARROW_RIGHT);
			await tick();
			ui.stdin.write(ARROW_RIGHT);
			await tick();
			ui.stdin.write(CTRL_K);
			await tick();
			expect(lastChange(state)).toBe("abc");
			ui.stdin.write(CTRL_U);
			await tick();
			expect(lastChange(state)).toBe("");
		} finally {
			ui.unmount();
		}
	});

	test("Esc fires onCancel without submitting", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("hi");
			await tick();
			ui.stdin.write(ESC);
			await tick();
			expect(state.cancel).toBe(1);
			expect(state.submit).toEqual([]);
		} finally {
			ui.unmount();
		}
	});

	test("End escape sequence jumps to end of line", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("abc");
			await tick();
			ui.stdin.write(HOME);
			await tick();
			ui.stdin.write(END);
			await tick();
			ui.stdin.write("Z");
			await tick();
			expect(lastChange(state)).toBe("abcZ");
		} finally {
			ui.unmount();
		}
	});

	test("Ctrl+J inserts a newline (portable newline chord)", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("ab");
			await tick();
			ui.stdin.write(CTRL_J);
			await tick();
			ui.stdin.write("c");
			await tick();
			expect(lastChange(state)).toBe("ab\nc");
			// Submit with Enter (\r) — must remain submit, not newline.
			ui.stdin.write(ENTER);
			await tick();
			expect(state.submit).toContain("ab\nc");
		} finally {
			ui.unmount();
		}
	});

	test("Delete key (CSI 3~) collapses to backspace per ink-ui convention", async () => {
		const { state, ui } = mount();
		try {
			await tick();
			ui.stdin.write("abc");
			await tick();
			// CSI 3~ (forward Delete) maps to key.delete in ink. We treat
			// key.backspace and key.delete the same way — both remove the
			// character to the left of the cursor.
			ui.stdin.write(DELETE_FORWARD);
			await tick();
			expect(lastChange(state)).toBe("ab");
		} finally {
			ui.unmount();
		}
	});
});
