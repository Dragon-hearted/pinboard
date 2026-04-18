import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { ImageThumb } from "../components/ImageThumb.tsx";
import { Pill } from "../components/Pill.tsx";
import { colors, caption } from "../theme.ts";
import type { GenerationRecord } from "../services/types.ts";

type CardProps = ComponentProps<typeof Card>;

interface PreviewProps {
	generation: GenerationRecord | null;
	inFlight: boolean;
	lastError?: string | null;
	focused?: boolean;
	position?: { index: number; total: number } | null;
	cardProps?: CardProps;
}

const THUMB_COLS = 24;
const THUMB_ROWS = 10;

export function Preview({
	generation,
	inFlight,
	lastError,
	focused,
	position,
	cardProps,
}: PreviewProps) {
	return (
		<Card {...cardProps}>
			<Box justifyContent="space-between">
				<Text color={colors.ashGray}>{caption("Preview")}</Text>
				{focused ? <Pill>focus</Pill> : null}
			</Box>
			{position && position.total > 1 ? (
				<Box>
					<Text color={colors.stoneGray}>
						{caption(`${position.index + 1} / ${position.total}`)}
					</Text>
				</Box>
			) : null}

			<Box marginTop={1} flexDirection="column">
				{inFlight ? (
					<Box>
						<Spinner label="Generating…" />
					</Box>
				) : generation ? (
					<Box flexDirection="column">
						<ImageThumb
							path={generation.resultPath}
							width={THUMB_COLS}
							height={THUMB_ROWS}
						/>
						<Box marginTop={1}>
							<Text color={colors.linkGray}>
								{generation.id.slice(0, 12)}
							</Text>
						</Box>
						<Box marginTop={1} flexDirection="column">
							<Text color={colors.stoneGray}>{caption("Model")}</Text>
							<Text color={colors.warmParchment}>{generation.model}</Text>
						</Box>
						<Box marginTop={1} flexDirection="column">
							<Text color={colors.stoneGray}>{caption("Prompt")}</Text>
							<Text color={colors.ashGray}>
								{truncate(generation.prompt, 200)}
							</Text>
						</Box>
						<Box marginTop={1} flexDirection="column">
							<Text color={colors.stoneGray}>{caption("Created")}</Text>
							<Text color={colors.ashGray}>
								{formatDate(generation.createdAt)}
							</Text>
						</Box>
					</Box>
				) : (
					<Text color={colors.stoneGray}>
						No generation yet. Press{" "}
						<Text color={colors.warmParchment}>g</Text> once you have a
						prompt.
					</Text>
				)}
			</Box>

			{lastError ? (
				<Box marginTop={1}>
					<Text color={colors.mutedRust}>{lastError}</Text>
				</Box>
			) : null}
		</Card>
	);
}

function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	return `${s.slice(0, max - 1)}…`;
}

function formatDate(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString();
	} catch {
		return iso;
	}
}
