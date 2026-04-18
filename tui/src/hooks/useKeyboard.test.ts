import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import React from "react";
import { render } from "ink";
import { useKeyboard, type ModalId } from "./useKeyboard";

/**
 * Minimal stdin stub that satisfies ink's useInput: it's a readable-ish
 * EventEmitter with setRawMode/isTTY/ref/unref so ink accepts it, and
 * exposes `.emit("data", "x")` to simulate keystrokes.
 */
function makeStdin() {
	const queue: string[] = [];
	const emitter = new EventEmitter() as EventEmitter & {
		isTTY: boolean;
		setRawMode: (v: boolean) => void;
		setEncoding: (enc: string) => void;
		resume: () => void;
		pause: () => void;
		read: () => string | null;
		ref: () => void;
		unref: () => void;
		addListener: EventEmitter["addListener"];
		removeListener: EventEmitter["removeListener"];
	};
	emitter.isTTY = true;
	emitter.setRawMode = () => {};
	emitter.setEncoding = () => {};
	emitter.resume = () => {};
	emitter.pause = () => {};
	emitter.read = () => (queue.length > 0 ? (queue.shift() ?? null) : null);
	emitter.ref = () => {};
	emitter.unref = () => {};
	// Expose a helper that pushes a chunk and triggers `readable`, matching
	// ink's App.handleReadable which reads-until-null on each event.
	(emitter as unknown as { pushChunk(s: string): void }).pushChunk = (s) => {
		queue.push(s);
		emitter.emit("readable");
	};
	return emitter as typeof emitter & { pushChunk(s: string): void };
}

interface Harness {
	modals: (ModalId | "quit")[];
	invalidKeys: string[];
	send: (s: string) => void;
	cleanup: () => void;
}

function mount(): Harness {
	const modals: (ModalId | "quit")[] = [];
	const invalidKeys: string[] = [];
	const stdin = makeStdin();

	function Probe() {
		useKeyboard({
			focus: "gallery",
			modal: null,
			setFocus: () => {},
			setModal: (m) => {
				modals.push(m);
			},
			quit: () => {
				modals.push("quit");
			},
			onInvalidKey: (reason) => {
				invalidKeys.push(reason);
			},
		});
		return null;
	}

	const instance = render(React.createElement(Probe), {
		stdin: stdin as unknown as NodeJS.ReadStream,
		stdout: process.stdout,
		stderr: process.stderr,
		debug: false,
		exitOnCtrlC: false,
		patchConsole: false,
	});

	return {
		modals,
		invalidKeys,
		send: (s) => stdin.pushChunk(s),
		cleanup: () => instance.unmount(),
	};
}

const tick = () => new Promise<void>((r) => setImmediate(r));

describe("useKeyboard — global dispatch", () => {
	test("lowercase x opens clear-confirm modal", async () => {
		const h = mount();
		try {
			await tick();
			h.send("x");
			await tick();
			expect(h.modals).toContain("clear-confirm");
		} finally {
			h.cleanup();
		}
	});

	test("uppercase X opens clear-confirm modal", async () => {
		const h = mount();
		try {
			await tick();
			h.send("X");
			await tick();
			expect(h.modals).toContain("clear-confirm");
		} finally {
			h.cleanup();
		}
	});

	test("lowercase r opens aspect-ratio modal", async () => {
		const h = mount();
		try {
			await tick();
			h.send("r");
			await tick();
			expect(h.modals).toContain("aspect-ratio");
		} finally {
			h.cleanup();
		}
	});
});
