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
			<Text color={colors.mutedRust}>{caption("Clear everything")}</Text>
			<Box marginTop={1} flexDirection="column">
				<Text color={colors.warmParchment}>
					This deletes ALL uploaded images, ALL Pinterest downloads,
					ALL generation copies, and every row in the local database.
				</Text>
				<Box marginTop={1}>
					<Text color={colors.stoneGray}>
						{caption("Files on disk are removed too. This cannot be undone.")}
					</Text>
				</Box>
				<Box marginTop={1}>
					{busy ? (
						<Spinner label="Wiping…" />
					) : (
						<Text color={colors.stoneGray}>
							{caption("y / Enter wipe · n / Esc cancel")}
						</Text>
					)}
				</Box>
			</Box>
		</Card>
	);
}
