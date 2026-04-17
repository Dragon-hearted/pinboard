import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, useApp } from "ink";
import { Header } from "./components/Header.tsx";
import { StatusBar } from "./components/StatusBar.tsx";

import { Gallery } from "./screens/Gallery.tsx";
import { PromptPanel } from "./screens/PromptPanel.tsx";
import { Preview } from "./screens/Preview.tsx";
import { ModelPicker } from "./screens/ModelPicker.tsx";
import { PinterestModal } from "./screens/PinterestModal.tsx";
import { AddFileModal } from "./screens/AddFileModal.tsx";
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
		}),
		[refs, useHighlightedAsRef, visionDraft, generateNow],
	);

	const promptKeymap = useMemo<Keymap>(() => ({}), []);

	const captureMode = focus === "prompt" && !modal;

	useKeyboard({
		focus,
		modal,
		setFocus,
		setModal,
		quit: () => exit(),
		paneKeymap: focus === "gallery" ? galleryKeymap : promptKeymap,
		captureMode,
	});

	const latestGeneration = gens.generations[0] ?? null;

	const modelLabel = model
		? `${model.model} (${model.wisGateModel})`
		: null;

	return (
		<Box flexDirection="column" paddingX={1} paddingY={1} width="100%">
			<Header title="Pinboard" subtitle="Reference — Generate — Iterate" />

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
					generation={latestGeneration}
					inFlight={gens.inFlight}
					lastError={gens.lastError}
					cardProps={{ width: "30%", flexShrink: 0 }}
				/>
			</Box>

			<Box marginTop={1}>
				<StatusBar
					engineStatus={engine.status}
					modelName={model?.model ?? null}
					budget={engine.budget}
					version={VERSION}
				/>
			</Box>

			{modal === "help" ? (
				<Box marginTop={1}>
					<HelpOverlay />
				</Box>
			) : null}
			{modal === "model" ? (
				<Box marginTop={1}>
					<ModelPicker
						currentModelName={model?.model}
						onSelect={(m) => setModel(m)}
						onClose={() => setModal(null)}
					/>
				</Box>
			) : null}
			{modal === "pinterest" ? (
				<Box marginTop={1}>
					<PinterestModal
						onImport={async (url) => {
							await refs.addFromPinterest(url);
						}}
						onClose={() => setModal(null)}
					/>
				</Box>
			) : null}
			{modal === "add-file" ? (
				<Box marginTop={1}>
					<AddFileModal
						onAdd={async (path) => {
							await refs.addFromFile(path);
						}}
						onClose={() => setModal(null)}
					/>
				</Box>
			) : null}
		</Box>
	);
}
