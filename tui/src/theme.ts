// Sourced from design-system/adapters/chalk.ts via `just sync-design`.
// Legacy aliases (warmParchment, ashGray, stoneGray, etc.) are re-exported for compatibility
// with existing TUI components. New code should prefer the DS-native names (paper, muted, oxblood, etc.).
export * from "../../vendor/design-system/adapters/chalk";

// Legacy `colors` object — augments DS colors with the 8 original pinboard key names.
// consumers access colors.warmParchment, colors.ashGray, etc. via the `colors` export.
import { colors as _dsColors } from "../../vendor/design-system/adapters/chalk";

export const colors = {
  ..._dsColors,
  // Legacy aliases mapped to DS equivalents
  warmParchment: _dsColors.paper,       // "#faf9f6" → paper "#EEE6D4"
  ashGray:       _dsColors.muted,       // "#afaeac" → muted "#6B5F4F"
  stoneGray:     _dsColors.muted,       // "#868584" → muted (closest neutral)
  earthGray:     _dsColors.ink,         // "#353534" → ink   "#1A1714"
  mistBorder:    _dsColors.muted,       // "#555555" → muted "#6B5F4F"
  linkGray:      _dsColors.muted,       // "#666469" → muted "#6B5F4F"
  mutedOchre:    _dsColors.amber,       // "#8a7539" → amber "#B45309"
  mutedRust:     _dsColors.oxblood,     // "#8a4a3a" → oxblood "#8B2A1D"
} as const;
