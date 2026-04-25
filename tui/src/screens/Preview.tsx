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
	/** True when a newer generation exists than the one being viewed. */
	hasFresher?: boolean;
	cardProps?: CardProps;
}

const THUMB_COLS = 24;
const THUMB_ROWS = 10;
const PROMPT_MAX_LINES = 4;

export function Preview({
	generation,
	inFlight,
	lastError,
	focused,
	position,
	hasFresher,
	cardProps,
}: PreviewProps) {
	return (
		<Card {...cardProps}>
			<Box justifyContent="space-between">
				<Text color={colors.ashGray}>{caption("Preview")}</Text>
				{focused ? <Pill>focus</Pill> : null}
			</Box>
			{position ? (
				<Box>
					<Text color={colors.stoneGray}>
						{caption(`${position.index + 1} / ${position.total}`)}
					</Text>
					{hasFresher ? (
						<>
							<Text color={colors.stoneGray}>{"  "}</Text>
							<Text color={colors.warmParchment}>
								{caption("↑ new")}
							</Text>
						</>
					) : null}
				</Box>
			) : null}

			<Box marginTop={1} flexDirection="column">
				{inFlight ? (
					<Box>
						<Spinner label="Generating…" />
					</Box>
				) : generation ? (
					<Box flexDirection="column">
						<Box flexShrink={0}>
							<ImageThumb
								path={generation.resultPath}
								width={THUMB_COLS}
								height={THUMB_ROWS}
							/>
						</Box>
						<Box marginTop={1} flexDirection="column" flexShrink={1}>
							<Box>
								<Text color={colors.linkGray}>
									{generation.id.slice(0, 12)}
								</Text>
							</Box>
							<Box marginTop={1} flexDirection="column">
								<Text color={colors.stoneGray}>{caption("Model")}</Text>
								<Text color={colors.warmParchment}>
									{generation.model}
								</Text>
							</Box>
							<Box marginTop={1} flexDirection="column">
								<Text color={colors.stoneGray}>
									{caption("Prompt")}
								</Text>
								<Text color={colors.ashGray} wrap="wrap">
									{clampLines(generation.prompt, PROMPT_MAX_LINES, 80)}
								</Text>
							</Box>
							<Box marginTop={1} flexDirection="column">
								<Text color={colors.stoneGray}>
									{caption("Created")}
								</Text>
								<Text color={colors.ashGray}>
									{formatDate(generation.createdAt)}
								</Text>
							</Box>
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

/**
 * Soft-wrap a long prompt to at most `maxLines` of approximately `colsPerLine`
 * width. Returns the joined string with newline separators so Ink renders it
 * as multiple lines without padding past the metadata column.
 */
function clampLines(s: string, maxLines: number, colsPerLine: number): string {
	const trimmed = s.replace(/\s+/g, " ").trim();
	if (trimmed.length === 0) return "";
	const out: string[] = [];
	let i = 0;
	while (i < trimmed.length && out.length < maxLines) {
		out.push(trimmed.slice(i, i + colsPerLine));
		i += colsPerLine;
	}
	return out.join("\n");
}

function formatDate(iso: string): string {
	try {
		const d = new Date(iso);
		return d.toLocaleString();
	} catch {
		return iso;
	}
}
