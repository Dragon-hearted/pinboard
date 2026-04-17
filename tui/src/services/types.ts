/**
 * Shared types for Pinboard TUI services.
 * Ported from `systems/image-engine/src/types.ts` — do NOT cross-import.
 */

// ─── ImageEngine / WisGate types ───

export type WisGateModel =
	| "gemini-3-pro-image-preview"
	| "gemini-3.1-flash-image-preview"
	| "gemini-2.5-flash-image";

export type AspectRatio =
	| "1:1"
	| "2:3"
	| "3:2"
	| "3:4"
	| "4:3"
	| "4:5"
	| "5:4"
	| "9:16"
	| "16:9"
	| "21:9"
	| "1:4"
	| "1:8"
	| "4:1"
	| "8:1";

export type ImageSize = "0.5K" | "1K" | "2K" | "4K";

export interface TokenUsage {
	promptTokens: number;
	candidateTokens: number;
	totalTokens: number;
}

export interface GeminiPart {
	text?: string;
	inlineData?: { mimeType: string; data: string };
}

export interface GeminiContent {
	role: "user" | "model";
	parts: GeminiPart[];
}

export interface GenerationRequest {
	prompt: string;
	model?: WisGateModel;
	referenceImageIds?: string[];
	aspectRatio?: AspectRatio;
	imageSize?: ImageSize;
	forceImage?: boolean;
	systemInstruction?: string;
	conversationHistory?: GeminiContent[];
	sceneId?: string;
}

export interface GenerationResult {
	id: string;
	imageUrl: string;
	model: string;
	prompt: string;
	tokenUsage: TokenUsage;
	sceneId?: string;
	createdAt: string;
}

export interface BatchRequest {
	items: GenerationRequest[];
	dependencies?: { sceneId: string; dependsOn: string[] }[];
}

export interface BatchResult {
	results: Record<string, GenerationResult | { error: string }>;
	totalTokens: number;
}

export interface BudgetStatus {
	tokenCeiling: number;
	tokensSpent: number;
	tokensRemaining: number;
	percentUsed: number;
	isActive: boolean;
	wisGateBalance?: {
		available_balance: number;
		package_balance: number;
		cash_balance: number;
		token_balance: number;
		is_token_unlimited_quota: boolean;
	};
}

// ─── Pinboard DB record types ───

export type ImageSource = "upload" | "pinterest" | "generation-copy";

export interface ImageRecord {
	id: string;
	filename: string;
	originalName: string;
	path: string;
	mimeType: string;
	size: number;
	createdAt: string;
	source?: ImageSource;
	sourceUrl?: string | null;
}

export interface GenerationRecord {
	id: string;
	prompt: string;
	model: string;
	resultPath: string;
	/** JSON-stringified `string[]` OR `{ generation: string[]; promptOnly: string[] }` */
	referenceImageIds: string;
	createdAt: string;
}
