import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
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
			const detail = errors.length === 1 ? errors[0] : errors.join(" · ");
			setError(`Added ${added}, failed ${errors.length}: ${detail}`);
		} else {
			onClose();
		}
	};

	const handleSubmit = async (raw: string) => {
		const paths = splitPastedPaths(raw);
		await addMany(paths);
	};

	// Ctrl/Cmd+V image paste. Most terminals (Terminal.app, iTerm2, GNOME
	// Terminal, Alacritty) intercept the modifier and inject the clipboard text
	// directly into the input field — only Kitty + terminals running the kitty
	// keyboard protocol or `xterm*modifyOtherKeys: 2` reach this handler. The
	// regular text-path is what users hit on the common case.
	useInput((input, key) => {
		if (busy) return;
		if (!key.ctrl && !key.meta) return;
		if (input !== "v") return;

		const png = pasteImagePng();
		if (png && png.length > 0) {
			let dir: string | null = null;
			try {
				dir = mkdtempSync(join(tmpdir(), "pinboard-paste-"));
				const dest = join(dir, "clipboard.png");
				writeFileSync(dest, png);
				const sweep = dir;
				void addMany([dest]).finally(() => {
					try {
						rmSync(sweep, { recursive: true, force: true });
					} catch {
						// best-effort cleanup
					}
				});
			} catch (e) {
				if (dir) {
					try {
						rmSync(dir, { recursive: true, force: true });
					} catch {
						// best-effort cleanup
					}
				}
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
								"Paste / drag a path. Multi-line + multi-path supported. Image paste needs Kitty / kitty-keyboard-protocol terminals.",
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
								{caption("Esc cancel · Enter submit · Ctrl/Cmd+V image paste (kitty)")}
							</Text>
						</Box>
					</>
				)}
			</Box>
		</Card>
	);
}
