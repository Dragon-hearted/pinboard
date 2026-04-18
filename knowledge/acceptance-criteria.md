# Pinboard — Acceptance Criteria

These are the pass/fail gates for the 2026-04-18 work (case-insensitive `x` + aspect-ratio picker).

## Functional

- **AC-1**: Pressing lowercase `x` in the main TUI opens the clear-confirm modal (no "unknown key" flash).
- **AC-2**: Pressing uppercase `X` also opens the clear-confirm modal.
- **AC-3**: Pressing `r` (lowercase) opens the new `AspectRatioPicker` modal.
- **AC-4**: Selecting `16:9` in the picker stores it in state and flashes a confirmation.
- **AC-5**: After selecting a ratio, a `gens.generate()` call produces a `GenerationRequest` whose body contains `aspectRatio: "16:9"` — assertable via mocked `imageengine.generate` in a unit test.
- **AC-6**: Pressing `u` in the gallery pane with a generation highlighted promotes it to a reference (prior `r` behavior).
- **AC-7**: StatusBar hint renders exactly:

  ```
  a add · p pin · d del · X clear · v vision · g gen · r ratio · u ref · m model · ? help · q quit
  ```

## Build / Test

- **AC-8**: `cd systems/pinboard && just typecheck` exits 0.
- **AC-9**: `cd systems/pinboard && just tui-test` exits 0.
