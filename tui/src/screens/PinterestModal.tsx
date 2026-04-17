import { useState } from "react";
import { Box, Text } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { colors, caption } from "../theme.ts";
import { normalizePinUrl } from "../services/pinterest.ts";

interface PinterestModalProps {
	onImport(url: string): Promise<void>;
	onClose(): void;
}

export function PinterestModal({ onImport, onClose }: PinterestModalProps) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed) {
			setError("Paste a Pinterest URL to import.");
			return;
		}
		if (!normalizePinUrl(trimmed)) {
			setError("Not a valid pinterest.com/pin/<id> or pin.it URL.");
			return;
		}
		setError(null);
		setBusy(true);
		try {
			await onImport(trimmed);
			onClose();
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	};

	return (
		<Card borderColor={colors.ashGray} width="60%">
			<Text color={colors.warmParchment}>{caption("Import Pinterest")}</Text>
			<Box marginTop={1} flexDirection="column">
				{busy ? (
					<Spinner label="Downloading pin…" />
				) : (
					<>
						<Text color={colors.stoneGray}>
							{caption("Paste pin URL · Enter imports")}
						</Text>
						<Box
							marginTop={1}
							borderStyle="single"
							borderColor={colors.mistBorder}
							borderDimColor
							paddingX={1}
						>
							<TextInput
								placeholder="https://pinterest.com/pin/…"
								onSubmit={handleSubmit}
							/>
						</Box>
						{error ? (
							<Box marginTop={1}>
								<Text color={colors.mutedRust}>{error}</Text>
							</Box>
						) : null}
						<Box marginTop={1}>
							<Text color={colors.stoneGray}>{caption("Esc cancel")}</Text>
						</Box>
					</>
				)}
			</Box>
		</Card>
	);
}
