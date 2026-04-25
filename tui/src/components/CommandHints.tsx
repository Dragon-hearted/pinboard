import { Box, Text } from "ink";
import { colors } from "../theme.ts";
import type { FocusId } from "../hooks/useKeyboard.ts";

interface CommandHintsProps {
	focus: FocusId;
}

interface Chord {
	key: string;
	label: string;
}

const HINTS: Record<FocusId, Chord[]> = {
	gallery: [
		{ key: "j/k", label: "move" },
		{ key: "u", label: "use ref" },
		{ key: "v", label: "vision" },
		{ key: "w", label: "enrich" },
		{ key: "t", label: "toggle intent" },
		{ key: "g", label: "generate" },
		{ key: "d", label: "delete" },
	],
	prompt: [
		{ key: "Tab/Esc", label: "exit" },
		{ key: "Enter", label: "submit" },
		{ key: "Shift+Enter", label: "newline" },
	],
	preview: [
		{ key: "j/k", label: "history" },
		{ key: "End", label: "jump newest" },
	],
};

export function CommandHints({ focus }: CommandHintsProps) {
	const chords = HINTS[focus];
	return (
		<Box paddingX={1}>
			<Text>
				{chords.map((chord, i) => (
					<Text key={chord.key}>
						{i > 0 ? (
							<Text color={colors.stoneGray}>{" · "}</Text>
						) : null}
						<Text color={colors.warmParchment}>{chord.key}</Text>
						<Text color={colors.stoneGray}>{" "}</Text>
						<Text color={colors.ashGray}>{chord.label}</Text>
					</Text>
				))}
			</Text>
		</Box>
	);
}
