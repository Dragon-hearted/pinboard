import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { colors } from "../theme.ts";

type Props = ComponentProps<typeof Box> & { children?: ReactNode };

export function Card({ children, ...rest }: Props) {
  return (
    <Box
      borderStyle="round"
      borderColor={colors.mistBorder}
      borderDimColor
      padding={1}
      flexDirection="column"
      {...rest}
    >
      {children}
    </Box>
  );
}
