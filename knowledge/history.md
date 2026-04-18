# Pinboard — History

## 2026-04-18 — Case-insensitive clear + aspect-ratio picker

### Symptoms

1. **`x` clear binding broken**: pressing lowercase `x` surfaces an `Unknown key 'x'` warning. The on-screen hint reads `X clear`, but the handler only matches `Shift+x`. Regression introduced in commit `bfc3b95`.
2. **No aspect-ratio selection**: there is no user-facing way to choose image aspect ratio before generation. ImageEngine already accepts `aspectRatio` (14 possible values) and `imageSize`; Pinboard simply never forwards them.

### Root Causes

1. **Case-sensitivity mismatch** at `tui/src/hooks/useKeyboard.ts:117-120` — the `x` handler compares against the raw key without lowercasing, so only the shifted variant dispatches.
2. **Missing UI plumbing** — `AspectRatio` type union exists at `tui/src/services/types.ts:13-29` but is not exposed on `GenerateArgs`, no picker component exists, and no key is bound to one.

### Fix Summary

- Make the `x` / `X` clear binding case-insensitive.
- Add a new `AspectRatioPicker` modal (mirrors `ModelPicker.tsx`) behind the global `r` key.
- Remap the gallery-pane `r` (use-as-reference) handler to `u`.
- Thread `aspectRatio` through `useGenerations.generate` and into the ImageEngine request body.

### Guard Rail

Add a unit test asserting `useKeyboard` accepts both `x` and `X` so the regression cannot recur silently.
