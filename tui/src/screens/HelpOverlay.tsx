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
			{ key: "Tab", action: "Switch focus" },
			{ key: "j / ↓", action: "Next reference" },
			{ key: "k / ↑", action: "Previous reference" },
			{ key: "Enter", action: "Focus prompt" },
		],
	},
	{
		name: "Input",
		bindings: [
			{ key: "a", action: "Add file reference" },
			{ key: "p", action: "Import Pinterest URL" },
			{ key: "m", action: "Pick model" },
		],
	},
	{
		name: "Actions",
		bindings: [
			{ key: "v", action: "Vision draft prompt" },
			{ key: "g", action: "Generate from prompt" },
			{ key: "r", action: "Use highlighted as ref" },
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
