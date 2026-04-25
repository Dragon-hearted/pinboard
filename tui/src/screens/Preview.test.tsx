import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { Preview } from "./Preview.tsx";
import type { GenerationRecord } from "../services/types.ts";

/**
 * `formatDate` inside Preview uses `toLocaleString()`, which depends on the
 * host timezone. Drop everything from the CREATED caption onward before
 * snapshotting so the snapshot is stable across hosts.
 */
function stripDate(frame: string): string {
	const idx = frame.search(/C\s*R\s*E\s*A\s*T\s*E\s*D/);
	if (idx === -1) return frame;
	return `${frame.slice(0, idx)}<CREATED stripped>`;
}

function bigPrompt(len: number): string {
	const seed = "lorem ipsum dolor sit amet ";
	let out = "";
	while (out.length < len) out += seed;
	return out.slice(0, len);
}

const FIXED_DATE = "2026-04-25T12:00:00.000Z";

function makeGen(prompt: string): GenerationRecord {
	return {
		id: "abcdef0123456789",
		prompt,
		model: "gemini-3-pro-image-preview",
		resultPath: "/tmp/result.png",
		referenceImageIds: "[]",
		createdAt: FIXED_DATE,
	};
}

describe("Preview", () => {
	test("renders 800-char prompt wrapped without 200-char truncation suffix", () => {
		const prompt = bigPrompt(800);
		const ui = render(
			React.createElement(Preview, {
				generation: makeGen(prompt),
				inFlight: false,
				position: { index: 0, total: 1 },
				hasFresher: false,
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";

			// The 200-char truncation suffix would have been a single trailing
			// "…" right after exactly 199 prompt chars. The new component never
			// emits a truncation suffix at that boundary.
			const legacy = `${prompt.slice(0, 199)}…`;
			expect(frame.includes(legacy)).toBe(false);

			// Prompt content should be visible in the frame.
			expect(frame).toMatch(/lorem/);

			// Snapshot guards image-vs-metadata box separation. Date stripped
			// to keep the snapshot stable across timezones.
			expect(stripDate(frame)).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});

	test("does not emit the legacy 200-char ellipsis on a 250-char prompt", () => {
		const prompt = bigPrompt(250);
		const ui = render(
			React.createElement(Preview, {
				generation: makeGen(prompt),
				inFlight: false,
				position: { index: 0, total: 1 },
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			const legacy = `${prompt.slice(0, 199)}…`;
			expect(frame.includes(legacy)).toBe(false);
		} finally {
			ui.unmount();
		}
	});

	test("renders an ↑ new indicator when hasFresher is true and index > 0", () => {
		const ui = render(
			React.createElement(Preview, {
				generation: makeGen("short"),
				inFlight: false,
				position: { index: 2, total: 5 },
				hasFresher: true,
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/↑/);
			expect(frame).toMatch(/N\s*E\s*W/);
		} finally {
			ui.unmount();
		}
	});
});
