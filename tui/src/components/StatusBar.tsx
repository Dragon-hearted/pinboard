import { Box, Text } from "ink";
import { colors, caption } from "../theme.ts";
import type { BudgetStatus } from "../services/types.ts";
import type { EngineStatus } from "../hooks/useImageEngine.ts";

interface StatusBarProps {
	engineStatus: EngineStatus;
	modelName: string | null;
	budget: BudgetStatus | null;
	version: string;
}

const HINTS =
	"a add · p pin · v vision · g gen · r ref · m model · ? help · q quit";

export function StatusBar({
	engineStatus,
	modelName,
	budget,
	version,
}: StatusBarProps) {
	const dotColor =
		engineStatus === "up"
			? colors.warmParchment
			: engineStatus === "starting"
				? colors.ashGray
				: colors.stoneGray;
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
					<Text color={colors.stoneGray}>{"    BUDGET "}</Text>
					{renderBudget(budget)}
				</Text>
				<Text color={colors.stoneGray}>pinboard {version}</Text>
			</Box>
			<Box>
				<Text color={colors.stoneGray}>{caption(HINTS)}</Text>
			</Box>
		</Box>
	);
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

	const spent = budget.tokensSpent.toLocaleString();
	const ceil = budget.tokenCeiling.toLocaleString();

	return (
		<Text>
			<Text color={numberColor}>{spent}</Text>
			<Text color={colors.stoneGray}>{" / "}</Text>
			<Text color={colors.ashGray}>{ceil}</Text>
			<Text color={colors.stoneGray}>{" tokens "}</Text>
			<Text color={pctColor}>({pct}%)</Text>
		</Text>
	);
}
