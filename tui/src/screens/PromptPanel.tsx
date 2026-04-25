import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { Spinner } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { Pill } from "../components/Pill.tsx";
import { MultilineEditor } from "../components/MultilineEditor.tsx";
import { colors, caption } from "../theme.ts";
import type { ImageRecord } from "../services/types.ts";

type CardProps = ComponentProps<typeof Card>;

interface PromptPanelProps {
	focused: boolean;
	draft: string;
	onDraftChange(value: string): void;
	onDraftSubmit(value: string): void;
	onDraftCancel?(): void;
	selectedModelLabel: string | null;
	visionBusy: boolean;
	inFlight: boolean;
	lastError?: string | null;
	references: ImageRecord[];
	cardProps?: CardProps;
}

export function PromptPanel({
	focused,
	draft,
	onDraftChange,
	onDraftSubmit,
	onDraftCancel,
	selectedModelLabel,
	visionBusy,
	inFlight,
	lastError,
	references,
	cardProps,
}: PromptPanelProps) {
	const tokens = draft.match(/@(\d+)/g) ?? [];
	const resolvedRefs = tokens
		.map((t) => {
			const n = Number.parseInt(t.slice(1), 10);
			return { tag: t, ref: references[n - 1] ?? null };
		})
		.filter((x) => x.ref);

	return (
		<Card {...cardProps}>
			<Box justifyContent="space-between">
				<Text color={colors.ashGray}>{caption("Prompt")}</Text>
				<Box>
					{focused ? <Pill>editing</Pill> : null}
					{inFlight ? (
						<Box marginLeft={1}>
							<Spinner label="Generating" />
						</Box>
					) : null}
					{visionBusy ? (
						<Box marginLeft={1}>
							<Spinner label="Vision" />
						</Box>
					) : null}
				</Box>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color={colors.stoneGray}>
					{caption("Model")}{" "}
					<Text color={colors.warmParchment}>
						{selectedModelLabel ?? "—"}
					</Text>
				</Text>
			</Box>

			<Box
				marginTop={1}
				flexDirection="column"
				borderStyle="single"
				borderColor={focused ? colors.ashGray : colors.mistBorder}
				borderDimColor={!focused}
				paddingX={1}
			>
				{focused ? (
					<MultilineEditor
						defaultValue={draft}
						placeholder="Describe the image… use @1 @2 to pin references."
						focused={focused}
						onChange={onDraftChange}
						onSubmit={onDraftSubmit}
						onCancel={onDraftCancel}
					/>
				) : (
					<Text color={draft ? colors.warmParchment : colors.stoneGray}>
						{draft || "Press Tab to edit the prompt."}
					</Text>
				)}
			</Box>

			{resolvedRefs.length > 0 ? (
				<Box marginTop={1} flexDirection="column">
					<Text color={colors.stoneGray}>{caption("Resolved refs")}</Text>
					{resolvedRefs.map(({ tag, ref }) => (
						<Text key={`${tag}-${ref?.id}`} color={colors.ashGray}>
							{"  "}
							<Text color={colors.warmParchment}>{tag}</Text>{" "}
							{ref?.originalName}
						</Text>
					))}
				</Box>
			) : null}

			<Box marginTop={1}>
				<Text color={colors.stoneGray}>
					{caption(
						focused
							? "Tab/Esc exit · Enter submit · Ctrl+J newline"
							: "g generate · v vision draft · Tab edit",
					)}
				</Text>
			</Box>

			{lastError ? (
				<Box marginTop={1}>
					<Text color={colors.mutedRust}>{lastError}</Text>
				</Box>
			) : null}
		</Card>
	);
}
