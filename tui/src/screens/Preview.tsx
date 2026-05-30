import type { ComponentProps } from "react";
import { Box, Text, useStdout } from "ink";
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
// Preview occupies ~60% of the terminal (Gallery is 40%). Card/Box paddings
// shave a few cells off — empirically ~8 cells of total horizontal chrome.
// Floor at 20 so very narrow terminals still produce a usable break width.
const PREVIEW_WIDTH_FRACTION = 0.6;
const PREVIEW_CHROME_COLS = 8;
const MIN_PROMPT_COLS = 20;

export function Preview({
	generation,
	inFlight,
	lastError,
	focused,
	position,
	hasFresher,
	cardProps,
}: PreviewProps) {
	const { stdout } = useStdout();
	const termCols = stdout?.columns ?? 80;
	const promptCols = Math.max(
		MIN_PROMPT_COLS,
		Math.floor(termCols * PREVIEW_WIDTH_FRACTION) - PREVIEW_CHROME_COLS,
	);
	return (
		<Card {...cardProps} focused={focused}>
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
									{clampLines(
										generation.prompt,
										PROMPT_MAX_LINES,
										promptCols,
									)}
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
	const words = trimmed.split(" ");
	let line = "";

	for (const w of words) {
		// A single word longer than the column cap — hard-break it.
		if (w.length > colsPerLine) {
			if (line) {
				out.push(line);
				line = "";
				if (out.length >= maxLines) break;
			}
			let i = 0;
			while (i < w.length && out.length < maxLines) {
				const chunk = w.slice(i, i + colsPerLine);
				if (i + colsPerLine >= w.length) {
					line = chunk;
				} else {
					out.push(chunk);
				}
				i += colsPerLine;
			}
			if (out.length >= maxLines) break;
			continue;
		}

		const candidate = line ? `${line} ${w}` : w;
		if (candidate.length > colsPerLine) {
			out.push(line);
			if (out.length >= maxLines) break;
			line = w;
		} else {
			line = candidate;
		}
	}
	if (line && out.length < maxLines) out.push(line);

	const consumed = out.join(" ").length;
	if (consumed < trimmed.length && out.length > 0) {
		const last = out[out.length - 1] ?? "";
		const room = Math.max(0, colsPerLine - 2);
		const head =
			last.length > room
				? last.slice(0, room).replace(/\s+\S*$/, "").trimEnd()
				: last;
		out[out.length - 1] = head ? `${head} …` : "…";
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
