import { useEffect, useState } from "react";
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
 *
 * Rendering is async (the half-block fallback decodes the image), so we paint
 * a sized placeholder on the first tick to avoid layout jitter.
 */
export function ImageThumb({ path, width, height, bare }: ImageThumbProps) {
	const [payload, setPayload] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		setPayload(null);
		renderThumb({ path, cols: width, rows: height })
			.then((s) => {
				if (alive) setPayload(s);
			})
			.catch(() => {
				if (alive) setPayload("");
			});
		return () => {
			alive = false;
		};
	}, [path, width, height]);

	const body = (
		<Box width={width} height={height} flexShrink={0}>
			<Text>{payload ?? "…"}</Text>
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
