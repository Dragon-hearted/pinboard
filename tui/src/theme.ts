import chalk from "chalk";

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

export const warmParchment = (text: string) =>
	chalk.hex(colors.warmParchment)(text);
export const ashGray = (text: string) => chalk.hex(colors.ashGray)(text);
export const stoneGray = (text: string) => chalk.hex(colors.stoneGray)(text);
export const earthGray = (text: string) => chalk.hex(colors.earthGray)(text);
export const mistBorder = (text: string) => chalk.hex(colors.mistBorder)(text);
export const linkGray = (text: string) => chalk.hex(colors.linkGray)(text);
export const mutedOchre = (text: string) => chalk.hex(colors.mutedOchre)(text);
export const mutedRust = (text: string) => chalk.hex(colors.mutedRust)(text);

export const caption = (text: string) =>
	text.toUpperCase().split(/\s+/).filter(Boolean).join("  ");
