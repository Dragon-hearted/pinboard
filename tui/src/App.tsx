import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, useApp } from "ink";
import { Header } from "./components/Header.tsx";
import { CommandHints } from "./components/CommandHints.tsx";
import { StatusBar, type StatusMessage, type StatusTone } from "./components/StatusBar.tsx";

import { Gallery } from "./screens/Gallery.tsx";
import { PromptPanel } from "./screens/PromptPanel.tsx";
import { Preview } from "./screens/Preview.tsx";
import { ModelPicker } from "./screens/ModelPicker.tsx";
import { PinterestModal } from "./screens/PinterestModal.tsx";
import { AddFileModal } from "./screens/AddFileModal.tsx";
import { ClearConfirmModal } from "./screens/ClearConfirmModal.tsx";
import { HelpOverlay } from "./screens/HelpOverlay.tsx";
import { AspectRatioPicker } from "./screens/AspectRatioPicker.tsx";

import { useReferences } from "./hooks/useReferences.ts";
import { useGenerations } from "./hooks/useGenerations.ts";
import { useImageEngine } from "./hooks/useImageEngine.ts";
import { usePinnedGenIndex } from "./hooks/usePinnedGenIndex.ts";
import { useVisionStatus } from "./hooks/useVisionStatus.ts";
import {
	useKeyboard,
	KEY_SENTINELS,
	type FocusId,
	type Keymap,
	type ModalId,
} from "./hooks/useKeyboard.ts";

import * as db from "./services/db.ts";
import * as promptwriter from "./services/promptwriter.ts";
import * as claudevision from "./services/claudevision.ts";
import type { PromptWriterModelInfo } from "./services/promptwriter.ts";
import type { AspectRatio } from "./services/types.ts";

const VERSION = "0.1.0";

export function App() {
	const { exit } = useApp();
	const refs = useReferences();
	const gens = useGenerations();
	const engine = useImageEngine();
	const vision = useVisionStatus();

	const [focus, setFocus] = useState<FocusId>("gallery");
	const [modal, setModal] = useState<ModalId>(null);
	const [draft, setDraft] = useState("");
	const [model, setModel] = useState<PromptWriterModelInfo | null>(null);
	const [aspectRatio, setAspectRatio] = useState<AspectRatio | null>(null);
	const [visionBusy, setVisionBusy] = useState(false);
	const [enrichBusy, setEnrichBusy] = useState(false);
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
		const promptOnlyRefIds: string[] = [];
		for (const n of tokens) {
			const r = refs.getAtTag(n);
			if (!r) continue;
			const intent = refs.intentMap.get(r.id) ?? "generation";
			if (intent === "prompt-only") {
				promptOnlyRefIds.push(r.id);
			} else {
				generationRefIds.push(r.id);
			}
		}
		await gens.generate({
			prompt: templated,
			modelId: model.wisGateModel,
			generationRefIds,
			promptOnlyRefIds,
			aspectRatio: aspectRatio ?? undefined,
		});
		await engine.refreshBudget();
	}, [draft, model, refs, gens, aspectRatio, engine]);

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

	const enhanceDraft = useCallback(async () => {
		if (!draft.trim() || !model) {
			flash("Type a prompt draft first.", "warn");
			return;
		}
		const target = refs.references[refs.selectedIndex] ?? null;
		setEnrichBusy(true);
		try {
			const enriched = await promptwriter.enrichWithGuide(draft, model.model, {
				imagePath: target?.path,
			});
			setDraft(enriched);
			flash("Prompt enriched.", "info");
		} catch (e) {
			flash(`Enrich failed: ${(e as Error).message}`, "error", 3000);
		} finally {
			setEnrichBusy(false);
		}
	}, [draft, model, refs.references, refs.selectedIndex, flash]);

	const toggleSelectedIntent = useCallback(() => {
		const target = refs.references[refs.selectedIndex];
		if (!target) {
			flash("Nothing selected to toggle.", "warn");
			return;
		}
		const next = refs.toggleIntent(target.id);
		flash(
			`@${refs.selectedIndex + 1} → ${next === "prompt-only" ? "draft" : "gen"}`,
			"info",
		);
	}, [refs, flash]);

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

	const clearGalleryAndPrompt = useCallback(async () => {
		try {
			const r = db.deleteImagesBySource("upload");
			setDraft("");
			refs.refresh();
			flash(`Cleared ${r.rows} uploads, prompt reset`, "info");
		} catch (e) {
			flash(`Clear failed: ${(e as Error).message}`, "error", 3000);
		}
	}, [refs, flash]);

	const galleryKeymap = useMemo<Keymap>(
		() => ({
			j: () => refs.selectDelta(1),
			k: () => refs.selectDelta(-1),
			[KEY_SENTINELS.arrowDown]: () => refs.selectDelta(1),
			[KEY_SENTINELS.arrowUp]: () => refs.selectDelta(-1),
			u: () => {
				void useHighlightedAsRef();
			},
			v: () => {
				void visionDraft();
			},
			w: () => {
				void enhanceDraft();
			},
			t: () => {
				toggleSelectedIntent();
			},
			g: () => {
				void generateNow();
			},
			d: () => {
				removeHighlighted();
			},
		}),
		[
			refs,
			useHighlightedAsRef,
			visionDraft,
			enhanceDraft,
			toggleSelectedIntent,
			generateNow,
			removeHighlighted,
		],
	);

	const promptKeymap = useMemo<Keymap>(() => ({}), []);

	const pinned = usePinnedGenIndex({
		generations: gens.generations,
		onNewer: () => flash("New generation ready — press End to jump", "info", 2500),
	});
	const { genIndex, jumpToNewest, stepForward, stepBack } = pinned;

	const previewKeymap = useMemo<Keymap>(
		() => ({
			j: stepForward,
			k: stepBack,
			[KEY_SENTINELS.arrowDown]: stepForward,
			[KEY_SENTINELS.arrowUp]: stepBack,
			[KEY_SENTINELS.end]: jumpToNewest,
		}),
		[stepForward, stepBack, jumpToNewest],
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
	const hasFresherGen =
		genIndex > 0 && gens.generations.length > 0;

	const modelLabel = model
		? `${model.model} (${model.wisGateModel})`
		: null;

	return (
		<Box flexDirection="column" paddingX={1} paddingY={1} width="100%">
			<Header title="Pinboard" subtitle="Reference — Generate — Iterate" />

			{modal === null ? (
				<Box flexDirection="column" marginTop={1} gap={1}>
					<Box flexDirection="row" gap={1}>
						<Gallery
							references={refs.references}
							selectedIndex={refs.selectedIndex}
							focused={focus === "gallery"}
							intentMap={refs.intentMap}
							cardProps={{ width: "40%", flexShrink: 0 }}
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
							hasFresher={hasFresherGen}
							cardProps={{ flexGrow: 1 }}
						/>
					</Box>

					<PromptPanel
						focused={focus === "prompt"}
						draft={draft}
						onDraftChange={setDraft}
						onDraftSubmit={(value) => {
							setDraft(value);
							setFocus("gallery");
						}}
						onDraftCancel={() => setFocus("gallery")}
						selectedModelLabel={modelLabel}
						visionBusy={visionBusy || enrichBusy}
						inFlight={gens.inFlight}
						lastError={gens.lastError ?? visionError}
						references={refs.references}
						cardProps={{ width: "100%" }}
					/>

					<CommandHints focus={focus} />
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
							onConfirm={clearGalleryAndPrompt}
							onClose={() => {
								setModal(null);
								setFocus("gallery");
							}}
						/>
					) : null}
					{modal === "aspect-ratio" ? (
						<AspectRatioPicker
							current={aspectRatio}
							onSelect={(r) => {
								setAspectRatio(r);
								flash(r ? `Ratio: ${r}` : "Ratio: auto", "info");
							}}
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
					aspectRatioLabel={aspectRatio ?? "Auto"}
					budget={engine.budget}
					version={VERSION}
					message={message}
					visionStatus={vision.status}
					visionReason={vision.reason}
				/>
			</Box>
		</Box>
	);
}
