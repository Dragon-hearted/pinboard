/**
 * PromptWriter integration: discover image models, load model guides,
 * and apply model-specific templates before sending prompts to ImageEngine.
 */

import { resolve } from "node:path";
import { listModels as registryListModels } from "../../../../prompt-writer/src/registry";
import type { ModelEntry } from "../../../../prompt-writer/src/registry";
import type { WisGateModel } from "./types";

const KNOWLEDGE_DIR = resolve(
	import.meta.dir,
	"../../../../prompt-writer/knowledge/models",
);

/**
 * Maps a PromptWriter model name (as listed in `_registry.md`) to the
 * `WisGateModel` it is served by. Only entries in BOTH lists are exposed.
 */
export const MODEL_NAME_TO_WISGATE: Record<string, WisGateModel> = {
	"NanoBanana Pro": "gemini-3-pro-image-preview",
	"NanoBanana Flash": "gemini-3.1-flash-image-preview",
	"NanoBanana Flash 2.5": "gemini-2.5-flash-image",
};

export interface PromptWriterModelInfo {
	model: string;
	provider: string;
	status: string;
	file: string;
	wisGateModel: WisGateModel;
}

export interface ModelGuideSections {
	overview?: string;
	access?: string;
	constraints?: string;
	promptStructure?: string;
	bestPractices?: string;
	workedExamples?: string;
	failureModes?: string;
	[custom: string]: string | undefined;
}

export interface ModelGuide {
	modelName: string;
	file: string;
	raw: string;
	sections: ModelGuideSections;
	/** Max prompt length in characters (extracted from Constraints). */
	maxPromptChars: number;
}

const DEFAULT_MAX_PROMPT = 8192;

type RegistryLoader = () => Promise<ModelEntry[]>;
let loadRegistry: RegistryLoader = () => registryListModels("image");

/** For tests: inject a registry loader; pass null to restore the real one. */
export function __setRegistryLoader(loader: RegistryLoader | null): void {
	loadRegistry = loader ?? (() => registryListModels("image"));
}

type FileReader = (path: string) => Promise<string>;
let readFile: FileReader = (path) => Bun.file(path).text();

/** For tests: inject a file reader; pass null to restore the real one. */
export function __setFileReader(reader: FileReader | null): void {
	readFile = reader ?? ((path) => Bun.file(path).text());
}

/**
 * List image models that are registered in PromptWriter AND supported by
 * ImageEngine's `WisGateModel` union. Result is deduped by model name.
 */
export async function listImageModels(): Promise<PromptWriterModelInfo[]> {
	const entries = await loadRegistry();
	const out: PromptWriterModelInfo[] = [];
	for (const e of entries) {
		if (e.type !== "image") continue;
		const wis = MODEL_NAME_TO_WISGATE[e.model];
		if (!wis) continue;
		out.push({
			model: e.model,
			provider: e.provider,
			status: e.status,
			file: e.file,
			wisGateModel: wis,
		});
	}
	return out;
}

function parseSections(markdown: string): ModelGuideSections {
	const sections: ModelGuideSections = {};
	const lines = markdown.split("\n");
	let current: string | null = null;
	let buf: string[] = [];

	const flush = () => {
		if (current) sections[current] = buf.join("\n").trim();
		buf = [];
	};

	const h2 = /^##\s+(.+?)\s*$/;
	for (const line of lines) {
		const m = h2.exec(line);
		if (m) {
			flush();
			const title = m[1].trim().toLowerCase();
			current =
				title === "overview"
					? "overview"
					: title === "access"
						? "access"
						: title === "constraints"
							? "constraints"
							: title === "prompt structure"
								? "promptStructure"
								: title === "best practices"
									? "bestPractices"
									: title === "worked examples"
										? "workedExamples"
										: title === "failure modes"
											? "failureModes"
											: title.replace(/\s+/g, "");
		} else if (current) {
			buf.push(line);
		}
	}
	flush();
	return sections;
}

function extractMaxPromptChars(constraints: string | undefined): number {
	if (!constraints) return DEFAULT_MAX_PROMPT;
	// Match table row like: "| Max prompt length | 8,192 chars | ..."
	const row = constraints
		.split("\n")
		.find((l) => /max prompt length/i.test(l));
	if (!row) return DEFAULT_MAX_PROMPT;
	const m = row.match(/([\d,]+)\s*chars?/i);
	if (!m) return DEFAULT_MAX_PROMPT;
	const n = parseInt(m[1].replace(/,/g, ""), 10);
	return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PROMPT;
}

/**
 * Load and parse the Markdown guide for a registered model. Sections are
 * keyed by slug (overview, access, constraints, promptStructure, etc.).
 */
export async function loadModelGuide(modelName: string): Promise<ModelGuide> {
	const entries = await loadRegistry();
	const entry = entries.find((e) => e.model === modelName);
	if (!entry) throw new Error(`Unknown model: ${modelName}`);
	const filePath = resolve(KNOWLEDGE_DIR, entry.file);
	const raw = await readFile(filePath);
	const sections = parseSections(raw);
	return {
		modelName,
		file: entry.file,
		raw,
		sections,
		maxPromptChars: extractMaxPromptChars(sections.constraints),
	};
}

const NANOBANANA_TERMINAL = "No text in image.";

function isNanoBanana(modelName: string): boolean {
	return /^NanoBanana/i.test(modelName);
}

/**
 * Apply model-specific formatting to a draft prompt:
 *   - NanoBanana (Pro/Flash): append "No text in image." if missing.
 *   - All models: truncate to the per-model character cap (default 8192).
 */
export async function applyTemplate(
	draftPrompt: string,
	modelName: string,
): Promise<string> {
	const guide = await loadModelGuide(modelName).catch(() => null);
	const max = guide?.maxPromptChars ?? DEFAULT_MAX_PROMPT;

	let out = draftPrompt.trim();
	if (isNanoBanana(modelName) && !out.endsWith(NANOBANANA_TERMINAL)) {
		const sep = out.length > 0 && !out.endsWith(".") ? ". " : " ";
		out = `${out}${sep}${NANOBANANA_TERMINAL}`.trim();
	}

	if (out.length > max) {
		// Truncate on a word boundary near the cap, preserve terminal line if present.
		const terminalSuffix = isNanoBanana(modelName)
			? NANOBANANA_TERMINAL
			: null;
		if (terminalSuffix) {
			const head = out.slice(0, max - terminalSuffix.length - 2);
			const trimmed = head.replace(/\s+\S*$/, "").trimEnd();
			out = `${trimmed} ${terminalSuffix}`;
		} else {
			out = out.slice(0, max).replace(/\s+\S*$/, "").trimEnd();
		}
	}

	return out;
}

export interface ValidationOutcome {
	ok: boolean;
	warnings: string[];
	errors: string[];
}

/**
 * Non-destructive check of a prompt against the model's constraints.
 * Does NOT mutate the prompt — use `applyTemplate` for that.
 */
export async function validatePromptForModel(
	prompt: string,
	modelName: string,
): Promise<ValidationOutcome> {
	const warnings: string[] = [];
	const errors: string[] = [];

	const guide = await loadModelGuide(modelName).catch(() => null);
	if (!guide) {
		errors.push(`No PromptWriter guide found for model: ${modelName}`);
		return { ok: false, warnings, errors };
	}

	if (prompt.length > guide.maxPromptChars) {
		errors.push(
			`Prompt is ${prompt.length} chars; ${modelName} max is ${guide.maxPromptChars}`,
		);
	} else if (prompt.length > Math.floor(guide.maxPromptChars * 0.9)) {
		warnings.push(
			`Prompt is near the ${modelName} cap (${prompt.length}/${guide.maxPromptChars})`,
		);
	}

	if (isNanoBanana(modelName) && !prompt.trim().endsWith(NANOBANANA_TERMINAL)) {
		warnings.push(
			`NanoBanana prompts should end with "${NANOBANANA_TERMINAL}" to avoid text artefacts`,
		);
	}

	return { ok: errors.length === 0, warnings, errors };
}
