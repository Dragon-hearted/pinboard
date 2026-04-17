import { Box, Text } from "ink";
import { colors } from "../theme.ts";
import { renderThumb } from "../utils/imageProtocol.ts";

interface ImageThumbProps {
	path: string;
	width: number;
	height: number;
	/** When true, no border is drawn — caller has its own container. */
	bare?: boolean;
}

/**
 * Renders an image inline in the terminal using the best-available protocol.
 * Consumers must provide explicit `width` (cols) and `height` (rows) so the
 * layout reserves space; the terminal scales the image to fit.
 */
export function ImageThumb({ path, width, height, bare }: ImageThumbProps) {
	const payload = renderThumb({ path, cols: width, rows: height });

	const body = (
		<Box width={width} height={height} flexShrink={0}>
			<Text>{payload}</Text>
		</Box>
	);

	if (bare) return body;

	return (
		<Box
			borderStyle="single"
			borderColor={colors.mistBorder}
			borderDimColor
			flexDirection="column"
			flexShrink={0}
		>
			{body}
		</Box>
	);
}
