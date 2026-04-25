import { describe, expect, test } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { StatusBar } from "./StatusBar.tsx";
import type { BudgetStatus } from "../services/types.ts";

function makeBudget(spent: number, ceiling: number): BudgetStatus {
	const remaining = Math.max(0, ceiling - spent);
	const pct = ceiling > 0 ? (spent / ceiling) * 100 : 0;
	return {
		tokenCeiling: ceiling * 1_000,
		tokensSpent: spent * 1_000,
		tokensRemaining: remaining * 1_000,
		percentUsed: pct,
		isActive: true,
		dollarsCeiling: ceiling,
		dollarsSpent: spent,
		dollarsRemaining: remaining,
		currencySymbol: "$",
	};
}

const baseProps = {
	engineStatus: "up" as const,
	modelName: "gemini-3-pro-image-preview",
	aspectRatioLabel: "Auto",
	version: "0.1.0",
	visionStatus: "ready" as const,
	visionReason: null,
};

describe("StatusBar budget rendering", () => {
	test("under 80% — neutral tones, used % + remaining $ visible", () => {
		const ui = render(
			React.createElement(StatusBar, {
				...baseProps,
				budget: makeBudget(2, 10),
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/\$2\.00/);
			expect(frame).toMatch(/\$10\.00/);
			expect(frame).toMatch(/used 20%/);
			expect(frame).toMatch(/remaining \$8\.00/);
			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});

	test("80–99% — warning tones", () => {
		const ui = render(
			React.createElement(StatusBar, {
				...baseProps,
				budget: makeBudget(9, 10),
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/\$9\.00/);
			expect(frame).toMatch(/used 90%/);
			expect(frame).toMatch(/remaining \$1\.00/);
			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});

	test("≥100% — blocked tones, remaining clamps to $0.00", () => {
		const ui = render(
			React.createElement(StatusBar, {
				...baseProps,
				budget: makeBudget(12, 10),
			}),
		);
		try {
			const frame = ui.lastFrame() ?? "";
			expect(frame).toMatch(/used 120%/);
			expect(frame).toMatch(/remaining \$0\.00/);
			expect(frame).toMatchSnapshot();
		} finally {
			ui.unmount();
		}
	});
});
