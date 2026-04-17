import { Text } from "ink";
import { colors } from "../theme.ts";

export function Pill({ children }: { children: string }) {
  return (
    <Text color={colors.warmParchment} backgroundColor={colors.earthGray}>
      {` ${children} `}
    </Text>
  );
}
