/**
 * claudesdk.ts — opt-in Anthropic SDK fallback for vision drafting.
 *
 * This path is only activated when `PINBOARD_ALLOW_API=1` is set AND the
 * `claudevision.ts` CLI invocation chain has fully failed. It uses the
 * official `@anthropic-ai/sdk` to send the image as a base64 content block
 * to Claude. This costs money against the user's `ANTHROPIC_API_KEY`, so we
 * log a loud line every time it fires.
 *
 * Default-off by design — the codebase otherwise leans on the local Claude
 * Code subscription (no paid API). The flag is read on every call so the
 * user can flip it without restarting pinboard.
 */

import { readFileSync } from "node:fs";
import { extname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type Anthropic_ from "@anthropic-ai/sdk";

type MediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
type ContentBlock = Anthropic_.ContentBlockParam;

export class SdkDisabledError extends Error {
	constructor() {
		super(
			"PINBOARD_ALLOW_API not set — SDK fallback is opt-in. " +
				"Export PINBOARD_ALLOW_API=1 to enable paid API vision.",
		);
		this.name = "SdkDisabledError";
	}
}

export class SdkMissingKeyError extends Error {
	constructor() {
		super("ANTHROPIC_API_KEY missing — SDK fallback cannot run.");
		this.name = "SdkMissingKeyError";
	}
}

const DEFAULT_MODEL = "claude-opus-4-7";
const MAX_TOKENS = 1024;

export interface SdkDraftOpts {
	instruction: string;
	imagePaths: string[];
	model?: string;
}

function isAllowed(): boolean {
	return process.env.PINBOARD_ALLOW_API === "1";
}

function mimeFor(path: string): MediaType {
	const ext = extname(path).toLowerCase();
	if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
	if (ext === ".gif") return "image/gif";
	if (ext === ".webp") return "image/webp";
	return "image/png";
}

/**
 * Draft a complete prompt by sending the user's intent + reference images
 * directly to the Anthropic API. Throws `SdkDisabledError` when the opt-in
 * flag is unset; `SdkMissingKeyError` when no API key is present.
 */
export async function draftWithSdk(opts: SdkDraftOpts): Promise<string> {
	if (!isAllowed()) throw new SdkDisabledError();
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new SdkMissingKeyError();

	console.warn(
		"vision: SDK fallback active (PINBOARD_ALLOW_API=1) — paid API call",
	);

	const client = new Anthropic({ apiKey });

	const content: ContentBlock[] = [
		{ type: "text", text: opts.instruction },
	];

	for (const path of opts.imagePaths) {
		const bytes = readFileSync(path);
		content.push({
			type: "image",
			source: {
				type: "base64",
				media_type: mimeFor(path),
				data: bytes.toString("base64"),
			},
		});
	}

	const response = await client.messages.create({
		model: opts.model ?? DEFAULT_MODEL,
		max_tokens: MAX_TOKENS,
		messages: [{ role: "user", content }],
	});

	const textBlock = response.content.find((b) => b.type === "text");
	if (!textBlock || textBlock.type !== "text") {
		throw new Error("SDK returned no text content");
	}
	return textBlock.text.trim();
}

/** True when the env flag is set; useful for routing decisions. */
export function sdkEnabled(): boolean {
	return isAllowed();
}
