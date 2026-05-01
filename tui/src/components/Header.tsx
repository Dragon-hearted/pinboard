import { Box, Text } from "ink";
import { tokens, caption } from "../theme.ts";

export function Header({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	const titleSpaced = caption(title).split("").join(" ");
	const frame = "▒▓█"
		.repeat(Math.max(1, Math.ceil(titleSpaced.length / 3)))
		.slice(0, titleSpaced.length);
	return (
		<Box flexDirection="column">
			<Text color={tokens.fgDim}>{frame}</Text>
			<Text color={tokens.fgPrimary} bold>
				{titleSpaced}
			</Text>
			<Text color={tokens.fgDim}>{frame}</Text>
			{subtitle ? (
				<Text color={tokens.fgMuted}>{caption(subtitle)}</Text>
			) : null}
		</Box>
	);
}
