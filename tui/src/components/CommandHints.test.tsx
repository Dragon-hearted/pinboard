import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { CommandHints } from "./CommandHints.tsx";

describe("CommandHints", () => {
	test("gallery focus lists move/use/vision/enrich/intent/generate/delete", () => {
		const ui = render(
			React.createElement(CommandHints, { focus: "gallery" }),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/j\/k/);
			expect(frame).toMatch(/move/);
			expect(frame).toMatch(/u/);
			expect(frame).toMatch(/use ref/);
			expect(frame).toMatch(/v/);
			expect(frame).toMatch(/vision/);
			expect(frame).toMatch(/w/);
			expect(frame).toMatch(/enrich/);
			expect(frame).toMatch(/t/);
			expect(frame).toMatch(/toggle intent/);
			expect(frame).toMatch(/g/);
			expect(frame).toMatch(/generate/);
			expect(frame).toMatch(/d /);
			expect(frame).toMatch(/delete/);
			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});

	test("prompt focus lists Tab/Esc, Enter submit, Ctrl+J newline", () => {
		const ui = render(
			React.createElement(CommandHints, { focus: "prompt" }),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/Tab\/Esc/);
			expect(frame).toMatch(/exit/);
			expect(frame).toMatch(/Enter/);
			expect(frame).toMatch(/submit/);
			expect(frame).toMatch(/Ctrl\+J/);
			expect(frame).toMatch(/newline/);
			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});

	test("preview focus lists j/k history and End jump newest", () => {
		const ui = render(
			React.createElement(CommandHints, { focus: "preview" }),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/j\/k/);
			expect(frame).toMatch(/history/);
			expect(frame).toMatch(/End/);
			expect(frame).toMatch(/jump newest/);
			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});
});
