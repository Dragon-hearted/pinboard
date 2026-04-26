import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import React from "react";
import { render } from "ink";
import {
	usePinnedGenIndex,
	type UsePinnedGenIndexApi,
} from "./usePinnedGenIndex";

function makeStdin() {
	const emitter = new EventEmitter() as EventEmitter & {
		isTTY: boolean;
		setRawMode: (v: boolean) => void;
		setEncoding: (enc: string) => void;
		resume: () => void;
		pause: () => void;
		read: () => string | null;
		ref: () => void;
		unref: () => void;
	};
	emitter.isTTY = true;
	emitter.setRawMode = () => {};
	emitter.setEncoding = () => {};
	emitter.resume = () => {};
	emitter.pause = () => {};
	emitter.read = () => null;
	emitter.ref = () => {};
	emitter.unref = () => {};
	return emitter;
}

const tick = () => new Promise<void>((r) => setImmediate(r));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface Gen {
	id: string;
}

interface Mounted {
	apiRef: { current: UsePinnedGenIndexApi | null };
	rerenderWith(generations: Gen[]): void;
	cleanup(): void;
	notifyCalls: { current: number };
}

function mount(initial: Gen[]): Mounted {
	const apiRef: { current: UsePinnedGenIndexApi | null } = { current: null };
	const notifyCalls = { current: 0 };
	let setGens: ((g: Gen[]) => void) | null = null;

	function Probe() {
		const [generations, setGenerations] = React.useState<Gen[]>(initial);
		setGens = setGenerations;
		apiRef.current = usePinnedGenIndex({
			generations,
			onNewer: () => {
				notifyCalls.current += 1;
			},
		});
		return null;
	}

	const stdin = makeStdin();
	const instance = render(React.createElement(Probe), {
		stdin: stdin as unknown as NodeJS.ReadStream,
		stdout: process.stdout,
		stderr: process.stderr,
		debug: false,
		exitOnCtrlC: false,
		patchConsole: false,
	});

	return {
		apiRef,
		rerenderWith: (gs) => setGens?.(gs),
		cleanup: () => instance.unmount(),
		notifyCalls,
	};
}

describe("usePinnedGenIndex", () => {
	test("auto-follows when the user is parked at index 0", async () => {
		const m = mount([{ id: "g1" }]);
		try {
			await tick();
			await wait(10);
			expect(m.apiRef.current?.genIndex).toBe(0);
			expect(m.apiRef.current?.pinnedGenId).toBe("g1");

			m.rerenderWith([{ id: "g2" }, { id: "g1" }]);
			await tick();
			await wait(10);

			expect(m.apiRef.current?.genIndex).toBe(0);
			expect(m.apiRef.current?.pinnedGenId).toBe("g2");
			// no "newer arrived" flash when user is following the head
			expect(m.notifyCalls.current).toBe(0);
		} finally {
			m.cleanup();
		}
	});

	test("preserves the pinned id when a new gen arrives mid-history", async () => {
		const m = mount([{ id: "g2" }, { id: "g1" }]);
		try {
			await tick();
			await wait(10);

			// User scrolls back to the older gen at index 1.
			m.apiRef.current?.setGenIndex(1);
			await tick();
			await wait(10);
			expect(m.apiRef.current?.genIndex).toBe(1);
			expect(m.apiRef.current?.pinnedGenId).toBe("g1");

			// A fresh generation arrives at the head.
			m.rerenderWith([{ id: "g3" }, { id: "g2" }, { id: "g1" }]);
			await tick();
			await wait(10);

			// genIndex re-anchors to the same logical generation (g1 is now idx 2).
			expect(m.apiRef.current?.pinnedGenId).toBe("g1");
			expect(m.apiRef.current?.genIndex).toBe(2);
			// onNewer fired exactly once because we crossed a head transition.
			expect(m.notifyCalls.current).toBe(1);
		} finally {
			m.cleanup();
		}
	});

	test("jumpToNewest snaps back to index 0", async () => {
		const m = mount([{ id: "g3" }, { id: "g2" }, { id: "g1" }]);
		try {
			await tick();
			await wait(10);

			m.apiRef.current?.setGenIndex(2);
			await tick();
			expect(m.apiRef.current?.genIndex).toBe(2);

			m.apiRef.current?.jumpToNewest();
			await tick();
			expect(m.apiRef.current?.genIndex).toBe(0);
			expect(m.apiRef.current?.pinnedGenId).toBe("g3");
		} finally {
			m.cleanup();
		}
	});

	test("stepForward / stepBack clamp at list boundaries", async () => {
		const m = mount([{ id: "g3" }, { id: "g2" }, { id: "g1" }]);
		try {
			await tick();
			await wait(10);

			m.apiRef.current?.stepBack();
			await tick();
			expect(m.apiRef.current?.genIndex).toBe(0);

			m.apiRef.current?.stepForward();
			m.apiRef.current?.stepForward();
			m.apiRef.current?.stepForward();
			m.apiRef.current?.stepForward();
			await tick();
			expect(m.apiRef.current?.genIndex).toBe(2);
		} finally {
			m.cleanup();
		}
	});

	test("re-anchors mid-history on a head shift without a one-frame mismatch", async () => {
		// Regression for the two-effect race: at [g3,g2,g1] @ idx 2 → [g4,g3,g2,g1],
		// the previous implementation briefly wrote generations[2].id ("g2") into
		// pinnedGenId before the second effect re-anchored to "g1". Collapsing the
		// effects keeps pinnedGenId in lock-step with the resolved index across
		// every render — never observe a (genIndex, pinnedGenId) pair that points
		// at different generations.
		const m = mount([{ id: "g3" }, { id: "g2" }, { id: "g1" }]);
		try {
			await tick();
			await wait(10);

			m.apiRef.current?.setGenIndex(2);
			await tick();
			await wait(10);
			expect(m.apiRef.current?.genIndex).toBe(2);
			expect(m.apiRef.current?.pinnedGenId).toBe("g1");

			m.rerenderWith([
				{ id: "g4" },
				{ id: "g3" },
				{ id: "g2" },
				{ id: "g1" },
			]);
			await tick();
			await wait(10);

			expect(m.apiRef.current?.pinnedGenId).toBe("g1");
			expect(m.apiRef.current?.genIndex).toBe(3);
			expect(m.notifyCalls.current).toBe(1);
		} finally {
			m.cleanup();
		}
	});

	test("does not fire onNewer on initial mount", async () => {
		const m = mount([{ id: "g1" }]);
		try {
			await tick();
			await wait(10);
			expect(m.notifyCalls.current).toBe(0);
		} finally {
			m.cleanup();
		}
	});
});
