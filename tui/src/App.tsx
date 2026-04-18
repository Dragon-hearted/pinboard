import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, useApp } from "ink";
import { Header } from "./components/Header.tsx";
import { StatusBar, type StatusMessage, type StatusTone } from "./components/StatusBar.tsx";

import { Gallery } from "./screens/Gallery.tsx";
import { PromptPanel } from "./screens/PromptPanel.tsx";
import { Preview } from "./screens/Preview.tsx";
import { ModelPicker } from "./screens/ModelPicker.tsx";
import { PinterestModal } from "./screens/PinterestModal.tsx";
import { AddFileModal } from "./screens/AddFileModal.tsx";
import { ClearConfirmModal } from "./screens/ClearConfirmModal.tsx";
import { HelpOverlay } from "./screens/HelpOverlay.tsx";

import { useReferences } from "./hooks/useReferences.ts";
import { useGenerations } from "./hooks/useGenerations.ts";
import { useImageEngine } from "./hooks/useImageEngine.ts";
import {
	useKeyboard,
	type FocusId,
	type Keymap,
	type ModalId,
} from "./hooks/useKeyboard.ts";

import * as db from "./services/db.ts";
import * as promptwriter from "./services/promptwriter.ts";
import * as claudevision from "./services/claudevision.ts";
import type { PromptWriterModelInfo } from "./services/promptwriter.ts";

const VERSION = "0.1.0";

export function App() {
	const { exit } = useApp();
	const refs = useReferences();
	const gens = useGenerations();
	const engine = useImageEngine();

	const [focus, setFocus] = useState<FocusId>("gallery");
	const [modal, setModal] = useState<ModalId>(null);
	const [draft, setDraft] = useState("");
	const [model, setModel] = useState<PromptWriterModelInfo | null>(null);
	const [visionBusy, setVisionBusy] = useState(false);
	const [visionError, setVisionError] = useState<string | null>(null);
	const [message, setMessage] = useState<StatusMessage | null>(null);
	const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const flash = useCallback(
		(text: string, tone: StatusTone = "info", ms = 2000) => {
			if (messageTimer.current) clearTimeout(messageTimer.current);
			setMessage({ text, tone });
			messageTimer.current = setTimeout(() => {
				setMessage(null);
				messageTimer.current = null;
			}, ms);
		},
		[],
	);

	useEffect(() => {
		return () => {
			if (messageTimer.current) clearTimeout(messageTimer.current);
		};
	}, []);

	// Default model: first from PromptWriter registry.
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const list = await promptwriter.listImageModels();
				if (cancelled || list.length === 0) return;
				setModel((m) => m ?? list[0] ?? null);
			} catch {
				// leave null; PromptPanel will show "—"
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const generateNow = useCallback(async () => {
		if (!draft.trim() || !model) return;
		const templated = await promptwriter.applyTemplate(draft, model.model);
		const tokens = Array.from(draft.matchAll(/@(\d+)/g)).map((m) =>
			Number.parseInt(m[1], 10),
		);
		const generationRefIds: string[] = [];
		for (const n of tokens) {
			const r = refs.getAtTag(n);
			if (r) generationRefIds.push(r.id);
		}
		await gens.generate({
			prompt: templated,
			modelId: model.wisGateModel,
			generationRefIds,
		});
	}, [draft, model, refs, gens]);

	const visionDraft = useCallback(async () => {
		const target = refs.references[refs.selectedIndex];
		if (!target) {
			setVisionError("Highlight a reference in the gallery first.");
			return;
		}
		setVisionBusy(true);
		setVisionError(null);
		try {
			const prompt = await claudevision.draftPrompt({
				imagePath: target.path,
				modelHint: model?.model,
			});
			const templated = model
				? await promptwriter.applyTemplate(prompt, model.model)
				: prompt;
			setDraft(templated);
		} catch (e) {
			setVisionError((e as Error).message);
		} finally {
			setVisionBusy(false);
		}
	}, [refs, model]);

	const useHighlightedAsRef = useCallback(async () => {
		const target = refs.references[refs.selectedIndex];
		if (!target) return;
		if (target.source === "generation-copy") {
			return;
		}
		try {
			await refs.addFromGeneration(target.id);
		} catch {
			// already an upload/pinterest row — nothing to do
		}
	}, [refs]);

	const removeHighlighted = useCallback(() => {
		const target = refs.references[refs.selectedIndex];
		if (!target) {
			flash("Nothing selected to remove.", "warn");
			return;
		}
		const name = target.originalName;
		try {
			refs.remove(target.id);
			flash(`Removed ${name}`, "info");
		} catch (e) {
			flash(`Remove failed: ${(e as Error).message}`, "error", 3000);
		}
	}, [refs, flash]);

	const clearAll = useCallback(async () => {
		try {
			const img = db.deleteAllImages();
			const gen = db.deleteAllGenerations();
			const uploadOrphans = db.purgeUploadOrphans();
			const downloadOrphans = db.purgeDownloadOrphans();
			refs.refresh();
			gens.refresh();
			flash(
				`Cleared ${img.rows} images, ${gen.rows} generations (${img.files + gen.files + uploadOrphans + downloadOrphans} files)`,
				"info",
				2500,
			);
		} catch (e) {
			flash(`Clear failed: ${(e as Error).message}`, "error", 3000);
		}
	}, [refs, gens, flash]);

	const galleryKeymap = useMemo<Keymap>(
		() => ({
			j: () => refs.selectDelta(1),
			k: () => refs.selectDelta(-1),
			r: () => {
				void useHighlightedAsRef();
			},
			v: () => {
				void visionDraft();
			},
			g: () => {
				void generateNow();
			},
			d: () => {
				removeHighlighted();
			},
		}),
		[refs, useHighlightedAsRef, visionDraft, generateNow, removeHighlighted],
	);

	const promptKeymap = useMemo<Keymap>(() => ({}), []);

	const [genIndex, setGenIndex] = useState(0);

	// Snap back to the newest generation whenever one arrives.
	const newestGenId = gens.generations[0]?.id ?? null;
	useEffect(() => {
		setGenIndex(0);
	}, [newestGenId]);

	const previewKeymap = useMemo<Keymap>(
		() => ({
			j: () =>
				setGenIndex((i) =>
					Math.min(i + 1, Math.max(0, gens.generations.length - 1)),
				),
			k: () => setGenIndex((i) => Math.max(0, i - 1)),
		}),
		[gens.generations.length],
	);

	const captureMode = focus === "prompt" && !modal;

	const paneKeymap =
		focus === "gallery"
			? galleryKeymap
			: focus === "preview"
				? previewKeymap
				: promptKeymap;

	useKeyboard({
		focus,
		modal,
		setFocus,
		setModal,
		quit: () => exit(),
		paneKeymap,
		captureMode,
		onInvalidKey: (reason) => flash(reason, "warn", 1800),
	});

	const selectedGeneration = gens.generations[genIndex] ?? null;

	const modelLabel = model
		? `${model.model} (${model.wisGateModel})`
		: null;

	return (
		<Box flexDirection="column" paddingX={1} paddingY={1} width="100%">
			<Header title="Pinboard" subtitle="Reference — Generate — Iterate" />

			{modal === null ? (
				<Box flexDirection="row" marginTop={1} gap={1}>
					<Gallery
						references={refs.references}
						selectedIndex={refs.selectedIndex}
						focused={focus === "gallery"}
						cardProps={{ width: "30%", flexShrink: 0 }}
					/>

					<PromptPanel
						focused={focus === "prompt"}
						draft={draft}
						onDraftChange={setDraft}
						onDraftSubmit={(value) => {
							setDraft(value);
							setFocus("gallery");
						}}
						selectedModelLabel={modelLabel}
						visionBusy={visionBusy}
						inFlight={gens.inFlight}
						lastError={gens.lastError ?? visionError}
						references={refs.references}
						cardProps={{ flexGrow: 1 }}
					/>

					<Preview
						generation={selectedGeneration}
						inFlight={gens.inFlight}
						lastError={gens.lastError}
						focused={focus === "preview"}
						position={
							gens.generations.length > 0
								? { index: genIndex, total: gens.generations.length }
								: null
						}
						cardProps={{ width: "30%", flexShrink: 0 }}
					/>
				</Box>
			) : (
				<Box marginTop={1} flexDirection="column" alignItems="center">
					{modal === "help" ? <HelpOverlay /> : null}
					{modal === "model" ? (
						<ModelPicker
							currentModelName={model?.model}
							onSelect={(m) => setModel(m)}
							onClose={() => {
								setModal(null);
								setFocus("gallery");
							}}
						/>
					) : null}
					{modal === "pinterest" ? (
						<PinterestModal
							onImport={async (url) => {
								await refs.addFromPinterest(url);
							}}
							onClose={() => {
								setModal(null);
								setFocus("gallery");
							}}
						/>
					) : null}
					{modal === "add-file" ? (
						<AddFileModal
							onAdd={async (path) => {
								await refs.addFromFile(path);
							}}
							onClose={() => {
								setModal(null);
								setFocus("gallery");
							}}
						/>
					) : null}
					{modal === "clear-confirm" ? (
						<ClearConfirmModal
							onConfirm={clearAll}
							onClose={() => {
								setModal(null);
								setFocus("gallery");
							}}
						/>
					) : null}
				</Box>
			)}

			<Box marginTop={1}>
				<StatusBar
					engineStatus={engine.status}
					modelName={model?.model ?? null}
					budget={engine.budget}
					version={VERSION}
					message={message}
				/>
			</Box>
		</Box>
	);
}
