import { useState } from "react";
import { Box, Text } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { colors, caption } from "../theme.ts";

interface AddFileModalProps {
	onAdd(path: string): Promise<void>;
	onClose(): void;
}

export function AddFileModal({ onAdd, onClose }: AddFileModalProps) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed) {
			setError("Enter a local file path.");
			return;
		}
		setError(null);
		setBusy(true);
		try {
			await onAdd(trimmed);
			onClose();
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	};

	return (
		<Card borderColor={colors.ashGray} width="60%">
			<Text color={colors.warmParchment}>{caption("Add reference")}</Text>
			<Box marginTop={1} flexDirection="column">
				{busy ? (
					<Spinner label="Copying file…" />
				) : (
					<>
						<Text color={colors.stoneGray}>
							{caption("Enter absolute or relative file path")}
						</Text>
						<Box
							marginTop={1}
							borderStyle="single"
							borderColor={colors.mistBorder}
							borderDimColor
							paddingX={1}
						>
							<TextInput
								placeholder="/path/to/image.png"
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
