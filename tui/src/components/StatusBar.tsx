import { Box, Text } from "ink";
import { colors, caption, tokens } from "../theme.ts";
import type { BudgetStatus } from "../services/types.ts";
import type { EngineStatus } from "../hooks/useImageEngine.ts";
import type { VisionStatus } from "../hooks/useVisionStatus.ts";

export type StatusTone = "info" | "warn" | "error";

export interface StatusMessage {
	text: string;
	tone: StatusTone;
}

interface StatusBarProps {
	engineStatus: EngineStatus;
	modelName: string | null;
	aspectRatioLabel?: string | null;
	budget: BudgetStatus | null;
	version: string;
	message?: StatusMessage | null;
	/** Vision CLI readiness — surfaced by builder-panes in task #4. */
	visionStatus?: VisionStatus;
	visionReason?: string | null;
}

const HINTS =
	"a add · p pin · d del · x clear · v vision · g gen · r ratio · u ref · m model · ? help · q quit";

export function StatusBar({
	engineStatus,
	modelName,
	aspectRatioLabel,
	budget,
	version,
	message,
	visionStatus,
	visionReason,
}: StatusBarProps) {
	const dotColor =
		engineStatus === "up"
			? tokens.accent
			: engineStatus === "starting"
				? tokens.warn
				: tokens.fgDim;
	const statusLabel =
		engineStatus === "up"
			? "up"
			: engineStatus === "starting"
				? "starting"
				: "down";

	return (
		<Box
			flexDirection="column"
			borderStyle="single"
			borderColor={colors.mistBorder}
			borderDimColor
			borderLeft={false}
			borderRight={false}
			borderBottom={false}
			paddingX={1}
			width="100%"
		>
			<Box justifyContent="space-between">
				<Text>
					<Text color={dotColor}>{"● "}</Text>
					<Text color={colors.stoneGray}>{"ENGINE "}</Text>
					<Text color={colors.ashGray}>{statusLabel}</Text>
					<Text color={colors.stoneGray}>{"    MODEL "}</Text>
					<Text color={colors.warmParchment}>{modelName ?? "—"}</Text>
					<Text color={colors.stoneGray}>{"    RATIO "}</Text>
					<Text color={colors.warmParchment}>{aspectRatioLabel ?? "Auto"}</Text>
					<Text color={colors.stoneGray}>{"    VISION "}</Text>
					{renderVision(visionStatus, visionReason)}
					<Text color={colors.stoneGray}>{"    BUDGET "}</Text>
					{renderBudget(budget)}
				</Text>
				<Text color={colors.stoneGray}>pinboard {version}</Text>
			</Box>
			<Box>
				{message ? (
					<Text color={messageColor(message.tone)}>
						{caption(message.text)}
					</Text>
				) : (
					<Text color={colors.stoneGray}>{caption(HINTS)}</Text>
				)}
			</Box>
		</Box>
	);
}

function renderVision(
	status: VisionStatus | undefined,
	reason: string | null | undefined,
) {
	if (!status || status === "checking") {
		return <Text color={colors.ashGray}>checking</Text>;
	}
	if (status === "ready") {
		return <Text color={colors.warmParchment}>ready</Text>;
	}
	const label = reason ? `unavailable (${reason})` : "unavailable";
	return <Text color={colors.mutedRust}>{label}</Text>;
}

function messageColor(tone: StatusTone): string {
	if (tone === "error") return colors.mutedRust;
	if (tone === "warn") return colors.mutedOchre;
	return colors.warmParchment;
}

function renderBudget(budget: BudgetStatus | null) {
	if (!budget) {
		return <Text color={colors.ashGray}>—</Text>;
	}
	const pct = Math.max(0, Math.min(999, Math.round(budget.percentUsed)));
	const blocked = pct >= 100;
	const warning = pct >= 80 && !blocked;

	const numberColor = blocked
		? colors.mutedRust
		: warning
			? colors.mutedOchre
			: colors.ashGray;
	const pctColor = blocked
		? colors.mutedRust
		: warning
			? colors.mutedOchre
			: colors.stoneGray;

	// Producer (image-engine) does not always emit dollar fields; fall back to
	// a token-based view so the bar still renders.
	const hasDollars =
		typeof budget.dollarsSpent === "number" &&
		typeof budget.dollarsCeiling === "number";

	if (hasDollars) {
		const symbol = budget.currencySymbol ?? "$";
		const spent = `${symbol}${(budget.dollarsSpent ?? 0).toFixed(2)}`;
		const ceil = `${symbol}${(budget.dollarsCeiling ?? 0).toFixed(2)}`;
		const remaining = `${symbol}${Math.max(0, budget.dollarsRemaining ?? 0).toFixed(2)}`;
		return (
			<Text>
				<Text color={numberColor}>{spent}</Text>
				<Text color={colors.stoneGray}>{" / "}</Text>
				<Text color={colors.ashGray}>{ceil}</Text>
				<Text color={colors.stoneGray}>{" (used "}</Text>
				<Text color={pctColor}>{`${pct}%`}</Text>
				<Text color={colors.stoneGray}>{") · remaining "}</Text>
				<Text color={numberColor}>{remaining}</Text>
			</Text>
		);
	}

	const fmt = (n: number) =>
		n >= 1_000_000
			? `${(n / 1_000_000).toFixed(1)}M`
			: n >= 1_000
				? `${(n / 1_000).toFixed(1)}k`
				: String(n);
	const spent = `${fmt(budget.tokensSpent)}t`;
	const ceil = `${fmt(budget.tokenCeiling)}t`;
	const remaining = `${fmt(Math.max(0, budget.tokensRemaining))}t`;
	return (
		<Text>
			<Text color={numberColor}>{spent}</Text>
			<Text color={colors.stoneGray}>{" / "}</Text>
			<Text color={colors.ashGray}>{ceil}</Text>
			<Text color={colors.stoneGray}>{" (used "}</Text>
			<Text color={pctColor}>{`${pct}%`}</Text>
			<Text color={colors.stoneGray}>{") · remaining "}</Text>
			<Text color={numberColor}>{remaining}</Text>
		</Text>
	);
}
