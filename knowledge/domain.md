# Pinboard — Domain Summary

## Runtime

Pinboard is a **terminal-first Ink TUI**. The active runtime lives in `tui/src/`; the older `.legacy/` directory is retired and must not be extended.

## Storage

- SQLite database at `pinboard.db` (WAL-enabled, co-located with the binary).
- Two tables: `references` (imported or user-added images) and `generations` (AI-generated images keyed to references).

## Primary Actions

- **`p`** — import a Pinterest URL → fetches and stores as a reference.
- **`a`** — add a local image file as a reference. Multi-path paste, drag-drop,
  and `Ctrl/Cmd+V` clipboard-image paste all supported.
- **`g`** — generate a new image from the current prompt + tagged-as-INPUT refs.
- **`v`** — (legacy) single-image vision tag of the highlighted ref.
- **`w`** — **draft a complete prompt** from the user's intent + tagged refs.
  This is the new primary creative loop: type intent in the Intent box,
  press `w`, the result fills the prompt textarea ready for `g`.
- **`t`** — toggle the highlighted ref between **IN** (sent to the model) and
  **DRAFT** (only seen by vision when drafting the prompt).
- **`u`** — promote the **latest generation** to the gallery as a new ref.
  Independent of which gallery row is highlighted.
- **`m`** — model picker modal.
- **`r`** — aspect-ratio picker modal.
- **`R`** — reload tools (kill image-engine, reset vision probe). See
  `knowledge/key-rotation.md` for the rotation flow.
- **`x` / `X`** — clear gallery **upload** rows (Pinterest imports are kept).
  Files under `uploads/` are preserved on disk — gallery deletion is soft by
  design.

## Gallery semantics

The gallery (`images` table) holds user-supplied references — both local
uploads (`source='upload'`) and Pinterest imports (`source='pinterest'`).
Generated images live in `generations` and never auto-mirror into the
gallery. The user opts in to promoting a generation via `u`.

Removing a row from the gallery (via `d` or `x`) is a soft-delete: the DB
row goes, the file in `uploads/` stays. To purge files explicitly use the
`purgeUploadOrphans` helper from `db.ts`.

## Image Generation Flow

The TUI calls `POST /api/generate` on the ImageEngine service at `$IMAGE_ENGINE_URL` (default `http://localhost:3002`). Before sending, **PromptWriter templates** are applied per selected model to massage the user prompt into provider-ready form.

## Vision Tagging

When enabled, Pinboard shells out to the Claude CLI (`$CLAUDE_BIN`) to describe/tag imported references. This is optional and runs on demand via the `v` binding.
