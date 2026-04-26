import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import React from "react";
import { render } from "ink";
import { __setFetch } from "../services/imageengine";
import type { BudgetStatus } from "../services/types";
import { useImageEngine, type UseImageEngineApi } from "./useImageEngine";

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

const fakeBudget = (spent: number): BudgetStatus => ({
	tokenCeiling: 1_000_000,
	tokensSpent: spent * 1000,
	tokensRemaining: 1_000_000 - spent * 1000,
	percentUsed: spent,
	isActive: true,
	dollarsCeiling: 10,
	dollarsSpent: spent / 10,
	dollarsRemaining: 10 - spent / 10,
	currencySymbol: "$",
});

interface FetchCall {
	url: string;
}

function mockFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
	const calls: FetchCall[] = [];
	const impl = (async (
		input: URL | RequestInfo,
		_init?: RequestInit,
	): Promise<Response> => {
		const url = typeof input === "string" ? input : (input as Request).url;
		const call = { url };
		calls.push(call);
		return handler(call);
	}) as unknown as typeof fetch;
	__setFetch(impl);
	return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const tick = () => new Promise<void>((r) => setImmediate(r));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("useImageEngine", () => {
	afterEach(() => {
		__setFetch(null);
	});

	test("exposes refreshBudget on the returned api", async () => {
		mockFetch(({ url }) => {
			if (url.endsWith("/health")) return new Response("ok", { status: 200 });
			if (url.endsWith("/api/budget")) return jsonResponse(fakeBudget(0));
			return new Response("not found", { status: 404 });
		});

		const apiRef: { current: UseImageEngineApi | null } = { current: null };
		function Probe() {
			apiRef.current = useImageEngine();
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

		try {
			await tick();
			await wait(20);
			expect(apiRef.current).not.toBeNull();
			expect(typeof apiRef.current?.refreshBudget).toBe("function");
		} finally {
			instance.unmount();
		}
	});

	test("refreshBudget() triggers an immediate poll regardless of the 10s interval", async () => {
		let spent = 5;
		const calls = mockFetch(({ url }) => {
			if (url.endsWith("/health")) return new Response("ok", { status: 200 });
			if (url.endsWith("/api/budget")) return jsonResponse(fakeBudget(spent));
			return new Response("not found", { status: 404 });
		});

		const apiRef: { current: UseImageEngineApi | null } = { current: null };
		function Probe() {
			apiRef.current = useImageEngine();
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

		try {
			await tick();
			await wait(20);
			const budgetCallsBefore = calls.filter((c) =>
				c.url.endsWith("/api/budget"),
			).length;
			expect(budgetCallsBefore).toBeGreaterThanOrEqual(1);

			spent = 42;
			await apiRef.current?.refreshBudget();

			const budgetCallsAfter = calls.filter((c) =>
				c.url.endsWith("/api/budget"),
			).length;
			expect(budgetCallsAfter).toBe(budgetCallsBefore + 1);
			expect(apiRef.current?.budget?.percentUsed).toBe(42);
		} finally {
			instance.unmount();
		}
	});
});
