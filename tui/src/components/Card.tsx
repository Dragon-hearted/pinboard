import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { colors, tokens } from "../theme.ts";

type Props = ComponentProps<typeof Box> & {
	children?: ReactNode;
	focused?: boolean;
};

export function Card({ children, focused, ...rest }: Props) {
	return (
		<Box
			borderStyle={focused ? "double" : "single"}
			borderColor={focused ? tokens.borderFocus : colors.mistBorder}
			borderDimColor={!focused}
			padding={1}
			flexDirection="column"
			{...rest}
		>
			{children}
		</Box>
	);
}
