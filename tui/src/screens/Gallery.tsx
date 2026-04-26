import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { Card } from "../components/Card.tsx";
import { ImageThumb } from "../components/ImageThumb.tsx";
import { Pill } from "../components/Pill.tsx";
import { colors, caption } from "../theme.ts";
import type { ImageRecord, ImageSource } from "../services/types.ts";
import type { ReferenceIntent } from "../hooks/useReferences.ts";

type CardProps = ComponentProps<typeof Card>;

interface GalleryProps {
	references: ImageRecord[];
	selectedIndex: number;
	focused: boolean;
	/** Optional per-ref intent map. Absent ids default to "generation". */
	intentMap?: Map<string, ReferenceIntent>;
	cardProps?: CardProps;
}

const SOURCE_LABEL: Record<ImageSource, string> = {
	upload: "upload",
	pinterest: "pinterest",
	"generation-copy": "generation",
};

const SELECTED_THUMB_COLS = 30;
const SELECTED_THUMB_ROWS = 12;

export function Gallery({
	references,
	selectedIndex,
	focused,
	intentMap,
	cardProps,
}: GalleryProps) {
	const selected = references[selectedIndex] ?? null;

	return (
		<Card {...cardProps}>
			<Box justifyContent="space-between">
				<Text color={colors.ashGray}>{caption("Gallery")}</Text>
				{focused ? <Pill>focus</Pill> : null}
			</Box>
			<Box marginTop={1} flexDirection="column">
				{references.length === 0 ? (
					<Text color={colors.stoneGray}>
						No references yet. Press{" "}
						<Text color={colors.warmParchment}>a</Text> to add a file or{" "}
						<Text color={colors.warmParchment}>p</Text> for Pinterest.
					</Text>
				) : (
					references.slice(0, 24).map((ref, i) => {
						const tag = `@${i + 1}`;
						const isSelected = i === selectedIndex;
						const source = (ref.source ?? "upload") as ImageSource;
						const label = SOURCE_LABEL[source] ?? source;
						const intent = intentMap?.get(ref.id) ?? "generation";
						const intentLabel = intent === "prompt-only" ? "DRAFT" : "IN";
						const intentColor =
							intent === "prompt-only"
								? colors.ashGray
								: colors.warmParchment;
						return (
							<Box key={ref.id} flexDirection="column" marginBottom={1}>
								<Box>
									<Text
										color={
											isSelected
												? colors.warmParchment
												: colors.stoneGray
										}
									>
										{isSelected ? "› " : "  "}
										{tag}{" "}
									</Text>
									<Text
										color={
											isSelected
												? colors.warmParchment
												: colors.ashGray
										}
									>
										{truncate(ref.originalName, 22)}
									</Text>
								</Box>
								<Box marginLeft={2}>
									<Text color={colors.linkGray}>
										{caption(label)}
									</Text>
									<Text color={colors.stoneGray}>{"  "}</Text>
									<Text color={intentColor}>{caption(intentLabel)}</Text>
								</Box>
							</Box>
						);
					})
				)}
			</Box>

			{selected ? (
				<Box marginTop={1} flexDirection="column">
					<Text color={colors.stoneGray}>{caption("Selected")}</Text>
					<Box marginTop={1}>
						<ImageThumb
							path={selected.path}
							width={SELECTED_THUMB_COLS}
							height={SELECTED_THUMB_ROWS}
						/>
					</Box>
				</Box>
			) : null}
		</Card>
	);
}

function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	return `${s.slice(0, max - 1)}…`;
}
