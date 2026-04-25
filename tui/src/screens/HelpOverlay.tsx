import { Box, Text } from "ink";
import { Card } from "../components/Card.tsx";
import { KeyHint } from "../components/KeyHint.tsx";
import { colors, caption } from "../theme.ts";

interface Binding {
	key: string;
	action: string;
}

interface Group {
	name: string;
	bindings: Binding[];
}

const GROUPS: Group[] = [
	{
		name: "Navigation",
		bindings: [
			{ key: "Tab", action: "Cycle gallery → prompt → preview" },
			{ key: "j / ↓", action: "Next ref (Gallery) or generation (Preview)" },
			{ key: "k / ↑", action: "Previous ref (Gallery) or generation (Preview)" },
			{ key: "End", action: "Jump to newest generation (Preview)" },
		],
	},
	{
		name: "Input",
		bindings: [
			{ key: "a", action: "Add file reference" },
			{ key: "p", action: "Import Pinterest URL" },
			{ key: "m", action: "Pick model" },
			{ key: "r", action: "Pick aspect ratio" },
			{ key: "Ctrl+J", action: "Insert newline in prompt editor (portable)" },
			{
				key: "Shift+Enter",
				action: "Insert newline (kitty/wezterm/xterm w/ modifyOtherKeys only)",
			},
		],
	},
	{
		name: "Actions",
		bindings: [
			{ key: "v", action: "Vision draft prompt from selected ref" },
			{ key: "w", action: "Enrich prompt via PromptWriter guide" },
			{ key: "t", action: "Toggle ref intent gen ↔ draft" },
			{ key: "u", action: "Use highlighted generation as ref" },
			{ key: "g", action: "Generate from current prompt" },
			{ key: "d", action: "Delete highlighted ref" },
			{ key: "x", action: "Clear gallery uploads + prompt draft" },
		],
	},
	{
		name: "Meta",
		bindings: [
			{ key: "?", action: "Toggle help" },
			{ key: "Esc", action: "Exit edit / close modal" },
			{ key: "q", action: "Quit" },
		],
	},
];

export function HelpOverlay() {
	return (
		<Card borderColor={colors.ashGray} width="80%">
			<Text color={colors.warmParchment}>{caption("Keybindings")}</Text>

			<Box marginTop={1} flexDirection="column">
				{GROUPS.map((group) => (
					<Box
						key={group.name}
						flexDirection="column"
						marginBottom={1}
					>
						<Text color={colors.stoneGray}>{caption(group.name)}</Text>
						<Box marginTop={1} flexDirection="column">
							{group.bindings.map(({ key, action }) => (
								<Box key={`${group.name}-${key}`}>
									<KeyHint keyName={key} action={action} />
								</Box>
							))}
						</Box>
					</Box>
				))}
			</Box>

			<Box marginTop={1}>
				<Text color={colors.stoneGray}>
					{caption("? or Esc closes this overlay")}
				</Text>
			</Box>
		</Card>
	);
}
