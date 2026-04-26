import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { render } from "ink";
import { __resetDb, initDb, insertImage } from "../services/db";
import {
	useReferences,
	type UseReferencesApi,
} from "./useReferences";

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

interface Mounted {
	apiRef: { current: UseReferencesApi | null };
	cleanup: () => void;
}

function mount(): Mounted {
	const apiRef: { current: UseReferencesApi | null } = { current: null };
	function Probe() {
		apiRef.current = useReferences();
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
	return { apiRef, cleanup: () => instance.unmount() };
}

describe("useReferences — intent map", () => {
	let tmpDir: string;

	beforeEach(() => {
		__resetDb();
		initDb(":memory:");
		tmpDir = mkdtempSync(join(tmpdir(), "pinboard-refs-test-"));
	});

	afterEach(() => {
		__resetDb();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	function seedImage(id: string): void {
		const path = join(tmpDir, `${id}.png`);
		writeFileSync(path, new Uint8Array([1, 2, 3]));
		insertImage({
			id,
			filename: `${id}.png`,
			originalName: `${id}.png`,
			path,
			mimeType: "image/png",
			size: 3,
			createdAt: new Date().toISOString(),
		});
	}

	test("intentMap is empty by default and getIntent returns 'generation' for any id", async () => {
		seedImage("img-a");
		seedImage("img-b");

		const m = mount();
		try {
			await tick();
			await wait(20);
			expect(m.apiRef.current).not.toBeNull();
			expect(m.apiRef.current!.intentMap.size).toBe(0);
			expect(m.apiRef.current!.getIntent("img-a")).toBe("generation");
			expect(m.apiRef.current!.getIntent("img-b")).toBe("generation");
			expect(m.apiRef.current!.getIntent("img-not-present")).toBe("generation");
		} finally {
			m.cleanup();
		}
	});

	test("setIntent('prompt-only') records the override and toggleIntent flips it back", async () => {
		seedImage("img-a");

		const m = mount();
		try {
			await tick();
			await wait(20);

			m.apiRef.current!.setIntent("img-a", "prompt-only");
			await tick();
			expect(m.apiRef.current!.intentMap.get("img-a")).toBe("prompt-only");
			expect(m.apiRef.current!.getIntent("img-a")).toBe("prompt-only");

			const next = m.apiRef.current!.toggleIntent("img-a");
			await tick();
			expect(next).toBe("generation");
			expect(m.apiRef.current!.intentMap.has("img-a")).toBe(false);
			expect(m.apiRef.current!.getIntent("img-a")).toBe("generation");
		} finally {
			m.cleanup();
		}
	});

	test("removed references drop out of the intent map", async () => {
		seedImage("img-a");
		seedImage("img-b");

		const m = mount();
		try {
			await tick();
			await wait(20);

			m.apiRef.current!.setIntent("img-a", "prompt-only");
			m.apiRef.current!.setIntent("img-b", "prompt-only");
			await tick();
			expect(m.apiRef.current!.intentMap.size).toBe(2);

			m.apiRef.current!.remove("img-a");
			await tick();
			await wait(10);
			expect(m.apiRef.current!.intentMap.has("img-a")).toBe(false);
			expect(m.apiRef.current!.intentMap.has("img-b")).toBe(true);
		} finally {
			m.cleanup();
		}
	});

	test("setIntent('generation') is a no-op when the id was never overridden", async () => {
		seedImage("img-a");

		const m = mount();
		try {
			await tick();
			await wait(20);

			const before = m.apiRef.current!.intentMap;
			m.apiRef.current!.setIntent("img-a", "generation");
			await tick();
			// state identity should not change because we returned `prev`
			expect(m.apiRef.current!.intentMap).toBe(before);
			expect(m.apiRef.current!.intentMap.size).toBe(0);
		} finally {
			m.cleanup();
		}
	});
});
