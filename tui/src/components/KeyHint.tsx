import { Text } from "ink";
import { colors, caption } from "../theme.ts";

export function KeyHint({
  keyName,
  action,
}: {
  keyName: string;
  action: string;
}) {
  return (
    <Text>
      <Text color={colors.warmParchment}>{keyName}</Text>
      <Text color={colors.stoneGray}>{`  ${caption(action)}`}</Text>
    </Text>
  );
}
