import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { colors, caption } from "../theme.ts";
import type { AspectRatio } from "../services/types.ts";

interface AspectRatioPickerProps {
	current: AspectRatio | null;
	onSelect(ratio: AspectRatio | null): void;
	onClose(): void;
}

const AUTO_VALUE = "__auto__";

const OPTIONS: { label: string; value: string }[] = [
	{ label: "Auto (provider default)", value: AUTO_VALUE },
	{ label: "1:1  Square", value: "1:1" },
	{ label: "16:9 Widescreen", value: "16:9" },
	{ label: "9:16 Portrait (vertical)", value: "9:16" },
	{ label: "4:5  Portrait (feed)", value: "4:5" },
	{ label: "5:4  Landscape (feed)", value: "5:4" },
	{ label: "3:2  DSLR landscape", value: "3:2" },
	{ label: "2:3  DSLR portrait", value: "2:3" },
	{ label: "4:3  Classic landscape", value: "4:3" },
	{ label: "3:4  Classic portrait", value: "3:4" },
	{ label: "21:9 Ultrawide", value: "21:9" },
	{ label: "1:4  Tall strip", value: "1:4" },
	{ label: "4:1  Wide strip", value: "4:1" },
	{ label: "1:8  Extra tall", value: "1:8" },
	{ label: "8:1  Extra wide", value: "8:1" },
];

export function AspectRatioPicker({
	current,
	onSelect,
	onClose,
}: AspectRatioPickerProps) {
	const defaultValue = current ?? AUTO_VALUE;
	const currentLabel = current ?? "Auto";

	return (
		<Card borderColor={colors.ashGray} width="60%">
			<Text color={colors.warmParchment}>{caption("Select aspect ratio")}</Text>
			<Box marginTop={1} flexDirection="column">
				<Select
					defaultValue={defaultValue}
					options={OPTIONS}
					onChange={(value) => {
						const next = value === AUTO_VALUE ? null : (value as AspectRatio);
						onSelect(next);
						onClose();
					}}
				/>
				<Box marginTop={1} flexDirection="column">
					<Text color={colors.stoneGray}>
						{caption(`Current: ${currentLabel}`)}
					</Text>
					<Text color={colors.stoneGray}>{caption("Esc cancel")}</Text>
				</Box>
			</Box>
		</Card>
	);
}
