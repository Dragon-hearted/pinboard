import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import { Card } from "../components/Card.tsx";
import { colors, caption } from "../theme.ts";
import * as promptwriter from "../services/promptwriter.ts";
import type { PromptWriterModelInfo } from "../services/promptwriter.ts";

interface ModelPickerProps {
	currentModelName?: string | null;
	onSelect(model: PromptWriterModelInfo): void;
	onClose(): void;
}

export function ModelPicker({
	currentModelName,
	onSelect,
	onClose,
}: ModelPickerProps) {
	const [models, setModels] = useState<PromptWriterModelInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const list = await promptwriter.listImageModels();
				if (cancelled) return;
				setModels(list);
			} catch (e) {
				if (cancelled) return;
				setError((e as Error).message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<Card borderColor={colors.ashGray} width="60%">
			<Text color={colors.warmParchment}>{caption("Select model")}</Text>
			<Box marginTop={1} flexDirection="column">
				{loading ? (
					<Spinner label="Loading models…" />
				) : error ? (
					<Text color={colors.mutedRust}>{error}</Text>
				) : models.length === 0 ? (
					<Text color={colors.stoneGray}>
						No models available. Check prompt-writer registry.
					</Text>
				) : (
					<>
						<Select
							defaultValue={currentModelName ?? models[0]?.model}
							options={models.map((m) => ({
								label: `${m.model}  ·  ${m.wisGateModel}`,
								value: m.model,
							}))}
							onChange={(value) => {
								const pick = models.find((m) => m.model === value);
								if (pick) {
									onSelect(pick);
									onClose();
								}
							}}
						/>
						<Box marginTop={1}>
							<Text color={colors.stoneGray}>
								{caption("Esc cancel")}
							</Text>
						</Box>
					</>
				)}
			</Box>
		</Card>
	);
}
