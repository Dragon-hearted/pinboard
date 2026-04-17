import { Box, Text } from "ink";
import { colors, caption } from "../theme.ts";

export function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Box flexDirection="column">
      <Text color={colors.warmParchment}>{title}</Text>
      {subtitle ? (
        <Text color={colors.stoneGray}>{caption(subtitle)}</Text>
      ) : null}
    </Box>
  );
}
