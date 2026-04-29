// ── Legacy palette (back-compat for existing callsites) ──────────────────
// Phase 2 migrates these to the semantic tokens below; Phase 1 keeps them
// verbatim so screens that import `colors.*` continue to render unchanged.
export const colors = {
	warmParchment: "#faf9f6",
	ashGray: "#afaeac",
	stoneGray: "#868584",
	earthGray: "#353534",
	mistBorder: "#555555",
	linkGray: "#666469",
	mutedOchre: "#8a7539",
	mutedRust: "#8a4a3a",
} as const;

export type ColorName = keyof typeof colors;

// ── Darkroom palette (Phase 1) ───────────────────────────────────────────
export const palette = {
	inkBlack: "#0a0908",
	noir: "#1a1716",
	chromeGray: "#4a4744",
	silverHalide: "#b9b3a8",
	bone: "#f3eee5",
	darkroomRed: "#c84630",
	safeAmber: "#e8a14e",
	kodakYellow: "#f5c84c",
} as const;

// ── Semantic tokens — new components import these ────────────────────────
export const tokens = {
	bg: palette.inkBlack,
	bgElevated: palette.noir,
	fgPrimary: palette.bone,
	fgMuted: palette.silverHalide,
	fgDim: palette.chromeGray,
	border: palette.chromeGray,
	borderFocus: palette.kodakYellow,
	accent: palette.darkroomRed,
	warn: palette.safeAmber,
	error: palette.darkroomRed,
	ok: palette.bone,
	highlight: palette.kodakYellow,
} as const;

export const caption = (text: string) =>
	text.toUpperCase().split(/\s+/).filter(Boolean).join("  ");
