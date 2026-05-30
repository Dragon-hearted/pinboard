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

## 2026-04-29 — Launcher CLI rubric-compliance pass

### Symptoms

1. **Silent failure on unknown flags**: `pinboard --bogus` falls through every `argv.includes()` check and renders the TUI, masking typos and stale flags instead of erroring out.
2. **Broken behavior when piped**: `pinboard | cat` dumps ANSI escapes into the pipe and Ink throws `Raw mode is not supported` because there is no TTY guard.
3. **Jargon-heavy help text**: tagline references "Warp-styled", and the `--ci` flag name describes *who* runs it rather than *what* it does. Help block has no Examples, no Learn more, and no Feedback section.
4. **Missing examples**: nothing in `--help` shows a new user how to launch a board, run the smoke test, or enable paid vision.
5. **`-v` collides with `--verbose` convention**: `-v` was bound to `--version`, conceding the standard short form for log verbosity.
6. **Magic 150ms smoke timeout**: cold bun starts in slow CI may not paint a frame in 150ms, and there is no override.
7. **SIGINT leaks the Ink instance**: Ctrl-C during the smoke window bypasses `instance.unmount()`, corrupting alt-screen and cursor state.

### Root Causes

The launcher used naive `argv.includes()` parsing with no validation, no TTY guard, a hard-coded smoke-frame timeout, and no signal handlers. The help text predated the cli-ux-designer rubric and did not follow the rubric's required sections (Usage, Flags, Examples, Learn more, Feedback) or the ALL-CAPS-without-trailing-colon section convention from the rubric reference layout.

### Fix Summary

- Migrated argv parsing to `node:util` `parseArgs` with `strict: true` so unknown flags exit 2 with a usage hint pointing at `pinboard --help`.
- Renamed `--ci` to `--smoke` (kept `--ci` as a hidden alias for one release) and added `--smoke-timeout-ms <n>` plus `PINBOARD_SMOKE_TIMEOUT_MS` env var override (default 150).
- Added `--no-color` flag (also honors `NO_COLOR=1`).
- Added a TTY guard that refuses to launch the TUI when stdout is not a TTY, with a hint pointing users at `--smoke` for non-interactive verification.
- In smoke mode, redirected the Ink render to stderr and write a single `ok\n` to stdout on success so `pinboard --smoke > out.txt` produces parseable output instead of an ANSI frame.
- Wired up SIGINT/SIGTERM handlers that unmount the Ink instance and exit 130/143 respectively, eliminating alt-screen corruption.
- Rewrote the help text with USAGE / FLAGS / EXAMPLES / LEARN MORE / FEEDBACK sections per the rubric reference layout (`~/.claude/skills/cli-ux-designer/help-text-example.txt`). Tagline replaced with the README's clearer line.
- Dropped `-v` short form for `--version`; reserved `-v`/`--verbose` for future log-verbosity work.
- Bumped launcher to v0.2.0.

### Guard Rail

The audit document at `app_docs/pinboard-cli-audit.md` is the standing rubric-compliance reference for the launcher surface. Future launcher changes should re-run that audit before merging. Add an integration test that asserts:

- `pinboard --bogus` exits with code 2.
- `pinboard --help` writes to stdout and exits 0.
- `echo "" | pinboard` exits 2 with a non-TTY error message.

### Deferred follow-ups

These are explicitly **NOT** done in this round and require `App.tsx` prop wiring before they can be implemented end-to-end:

- `--no-input` flag (refuse to open interactive prompts).
- `[board-name]` positional argument (deep-link to a specific board).
- Subcommand routing (`pinboard import|generate|gallery`) for scriptable operations.
- `--db <path>` and `--config <path>` overrides for SQLite location and `.env` file.
