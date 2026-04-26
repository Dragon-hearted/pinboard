import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { colors, caption } from "../theme.ts";

interface ClearConfirmModalProps {
	onConfirm(): Promise<void> | void;
	onClose(): void;
}

export function ClearConfirmModal({ onConfirm, onClose }: ClearConfirmModalProps) {
	const [busy, setBusy] = useState(false);

	useInput(async (input, key) => {
		if (busy) return;
		if (key.return || input === "y" || input === "Y") {
			setBusy(true);
			try {
				await onConfirm();
			} finally {
				onClose();
			}
			return;
		}
		if (input === "n" || input === "N") {
			onClose();
		}
	});

	return (
		<Card borderColor={colors.mutedRust} width="60%">
			<Text color={colors.mutedRust}>
				{caption("Clear gallery uploads + prompt")}
			</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color={colors.warmParchment}>
					Clear gallery uploads + prompt? Generation history kept.
				</Text>
				<Box marginTop={1}>
					<Text color={colors.stoneGray}>
						{caption(
							"Removes upload-source images and resets the prompt draft. Generations remain.",
						)}
					</Text>
				</Box>
				<Box marginTop={1}>
					{busy ? (
						<Spinner label="Clearing…" />
					) : (
						<Text color={colors.stoneGray}>
							{caption("y / Enter clear · n / Esc cancel")}
						</Text>
					)}
				</Box>
			</Box>
		</Card>
	);
}
