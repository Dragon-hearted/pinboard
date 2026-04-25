import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { Gallery } from "./Gallery.tsx";
import type { ImageRecord } from "../services/types.ts";
import type { ReferenceIntent } from "../hooks/useReferences.ts";

function makeRef(id: string, name: string): ImageRecord {
	return {
		id,
		filename: `${id}.png`,
		originalName: name,
		path: `/tmp/${id}.png`,
		mimeType: "image/png",
		size: 1024,
		createdAt: "2026-04-25T00:00:00.000Z",
		source: "upload",
		sourceUrl: null,
	};
}

describe("Gallery", () => {
	test("renders three refs with chevron on selected row only and gen/draft badges", () => {
		const refs: ImageRecord[] = [
			makeRef("a", "alpha.png"),
			makeRef("b", "beta.png"),
			makeRef("c", "gamma.png"),
		];
		const intentMap = new Map<string, ReferenceIntent>([
			["b", "prompt-only"],
		]);

		const ui = render(
			React.createElement(Gallery, {
				references: refs,
				selectedIndex: 1,
				focused: true,
				intentMap,
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";

			// Chevron only on the selected row.
			expect(frame.match(/▶/g)?.length ?? 0).toBe(1);
			// The chevron belongs to row @2 (selected index 1).
			expect(frame).toMatch(/▶\s*@2/);
			expect(frame).not.toMatch(/▶\s*@1/);
			expect(frame).not.toMatch(/▶\s*@3/);

			// Each row carries an intent badge. CAPTION upper-cases letters.
			const genCount = (frame.match(/G\s*E\s*N(?!\s*E\s*R\s*A)/g) ?? [])
				.length;
			expect(genCount).toBeGreaterThanOrEqual(2);
			expect(frame).toMatch(/D\s*R\s*A\s*F\s*T/);

			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});
});
