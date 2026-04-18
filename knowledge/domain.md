# Pinboard — Domain Summary

## Runtime

Pinboard is a **terminal-first Ink TUI**. The active runtime lives in `tui/src/`; the older `.legacy/` directory is retired and must not be extended.

## Storage

- SQLite database at `pinboard.db` (WAL-enabled, co-located with the binary).
- Two tables: `references` (imported or user-added images) and `generations` (AI-generated images keyed to references).

## Primary Actions

- **`p`** — import a Pinterest URL → fetches and stores as a reference.
- **`a`** — add a local image file as a reference.
- **`g`** — generate a new image from the current prompt + selected references.
- **`v`** — (optional) Claude CLI vision-tagging pass to enrich reference metadata.
- **`m`** — model picker modal.
- **`r`** — aspect-ratio picker modal (new, from 2026-04-18 work).
- **`u`** — in gallery pane, promote a generation to a reference (moved from `r`).
- **`x` / `X`** — clear all (case-insensitive as of 2026-04-18).

## Image Generation Flow

The TUI calls `POST /api/generate` on the ImageEngine service at `$IMAGE_ENGINE_URL` (default `http://localhost:3002`). Before sending, **PromptWriter templates** are applied per selected model to massage the user prompt into provider-ready form.

## Vision Tagging

When enabled, Pinboard shells out to the Claude CLI (`$CLAUDE_BIN`) to describe/tag imported references. This is optional and runs on demand via the `v` binding.
