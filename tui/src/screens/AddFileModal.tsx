import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Card } from "../components/Card.tsx";
import { colors, caption } from "../theme.ts";
import {
	pasteImagePng,
	pasteText,
	splitPastedPaths,
} from "../services/clipboard.ts";

interface AddFileModalProps {
	onAdd(path: string): Promise<void>;
	onClose(): void;
}

export function AddFileModal({ onAdd, onClose }: AddFileModalProps) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState<string | null>(null);

	const addMany = async (paths: string[]) => {
		if (paths.length === 0) {
			setError("No file paths detected.");
			return;
		}
		setError(null);
		setBusy(true);
		let added = 0;
		const errors: string[] = [];
		for (const p of paths) {
			try {
				setProgress(`Adding ${p.split("/").pop()}…`);
				await onAdd(p);
				added += 1;
			} catch (e) {
				errors.push(`${p}: ${(e as Error).message}`);
			}
		}
		setBusy(false);
		setProgress(null);
		if (errors.length > 0) {
			setError(`Added ${added}, failed ${errors.length}: ${errors[0]}`);
		} else {
			onClose();
		}
	};

	const handleSubmit = async (raw: string) => {
		const paths = splitPastedPaths(raw);
		await addMany(paths);
	};

	// Cmd+V / Ctrl+V image paste from clipboard. Pulls PNG bytes via pbpaste /
	// wl-paste / xclip and writes a temp file before delegating to onAdd.
	useInput((input, key) => {
		if (busy) return;
		if (!key.ctrl && !key.meta) return;
		if (input !== "v") return;

		const png = pasteImagePng();
		if (png && png.length > 0) {
			try {
				const dir = mkdtempSync(join(tmpdir(), "pinboard-paste-"));
				const dest = join(dir, "clipboard.png");
				writeFileSync(dest, png);
				void addMany([dest]);
			} catch (e) {
				setError(`Clipboard image failed: ${(e as Error).message}`);
			}
			return;
		}
		const text = pasteText();
		if (text) {
			void addMany(splitPastedPaths(text));
		}
	});

	return (
		<Card borderColor={colors.ashGray} width="60%">
			<Text color={colors.warmParchment}>{caption("Add reference")}</Text>
			<Box marginTop={1} flexDirection="column">
				{busy ? (
					<Spinner label={progress ?? "Copying file…"} />
				) : (
					<>
						<Text color={colors.stoneGray}>
							{caption(
								"Paste / drag a path. Multi-line + multi-path supported. Ctrl/Cmd+V pastes clipboard image.",
							)}
						</Text>
						<Box
							marginTop={1}
							borderStyle="single"
							borderColor={colors.mistBorder}
							borderDimColor
							paddingX={1}
						>
							<TextInput
								placeholder="/path/to/image.png  (or drop a file)"
								onSubmit={handleSubmit}
							/>
						</Box>
						{error ? (
							<Box marginTop={1}>
								<Text color={colors.mutedRust}>{error}</Text>
							</Box>
						) : null}
						<Box marginTop={1}>
							<Text color={colors.stoneGray}>
								{caption("Esc cancel · Enter submit · Ctrl/Cmd+V image paste")}
							</Text>
						</Box>
					</>
				)}
			</Box>
		</Card>
	);
}
