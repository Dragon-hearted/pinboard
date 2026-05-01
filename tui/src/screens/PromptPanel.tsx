import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import { Spinner, TextInput } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { Pill } from "../components/Pill.tsx";
import { MultilineEditor } from "../components/MultilineEditor.tsx";
import { colors, caption } from "../theme.ts";
import type { ImageRecord } from "../services/types.ts";
import type { ReferenceIntent } from "../hooks/useReferences.ts";

type CardProps = ComponentProps<typeof Card>;

interface PromptPanelProps {
	focused: boolean;
	draft: string;
	onDraftChange(value: string): void;
	onDraftSubmit(value: string): void;
	onDraftCancel?(): void;
	/** Short user intent fed to the vision drafter when `w` is pressed. */
	intent?: string;
	onIntentChange?(value: string): void;
	selectedModelLabel: string | null;
	visionBusy: boolean;
	inFlight: boolean;
	lastError?: string | null;
	references: ImageRecord[];
	intentMap?: Map<string, ReferenceIntent>;
	cardProps?: CardProps;
}

export function PromptPanel({
	focused,
	draft,
	onDraftChange,
	onDraftSubmit,
	onDraftCancel,
	intent,
	onIntentChange,
	selectedModelLabel,
	visionBusy,
	inFlight,
	lastError,
	references,
	intentMap,
	cardProps,
}: PromptPanelProps) {
	const tokens = draft.match(/@(\d+)/g) ?? [];
	const resolvedRefs = tokens
		.map((t) => {
			const n = Number.parseInt(t.slice(1), 10);
			return { tag: t, ref: references[n - 1] ?? null };
		})
		.filter((x) => x.ref);

	let inputCount = 0;
	let draftOnlyCount = 0;
	for (const r of references) {
		const i = intentMap?.get(r.id) ?? "generation";
		if (i === "prompt-only") draftOnlyCount += 1;
		else inputCount += 1;
	}

	return (
		<Card {...cardProps} focused={focused}>
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

			<Box marginTop={1} flexDirection="row" justifyContent="space-between">
				<Text color={colors.stoneGray}>
					{caption("Model")}{" "}
					<Text color={colors.warmParchment}>
						{selectedModelLabel ?? "—"}
					</Text>
				</Text>
				<Text color={colors.stoneGray}>
					{caption("INPUTS")}{" "}
					<Text color={colors.warmParchment}>{inputCount}</Text>
					<Text color={colors.stoneGray}> · {caption("DRAFT-ONLY")} </Text>
					<Text color={colors.warmParchment}>{draftOnlyCount}</Text>
				</Text>
			</Box>

			{onIntentChange ? (
				<Box
					marginTop={1}
					flexDirection="column"
					borderStyle="single"
					borderColor={colors.mistBorder}
					borderDimColor
					paddingX={1}
				>
					<Text color={colors.stoneGray}>{caption("Intent (vision drafts a complete prompt from this)")}</Text>
					<Box marginTop={0}>
						<TextInput
							placeholder="make the bag red, keep model pose…"
							defaultValue={intent ?? ""}
							onChange={onIntentChange}
						/>
					</Box>
				</Box>
			) : null}

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
							: "g generate · w draft from intent · u promote latest · t toggle intent · R reload tools",
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
