---
system: "pinboard"
type: execution
driver: cli
entry: "just start  # launches the Ink TUI (bun run bin/pinboard)"
mode: orchestrate
gates: executor
version: 1
lastUpdated: "2026-06-04"
lastUpdatedBy: build-mode
---

# Execution — Pinboard

How Execute Mode (`/adcelerate-execute`) runs this system. Execute Mode reads ONLY this manifest to decide how to run, then branches on `driver`.

## Invocation
Pinboard is an interactive Ink TUI; launch it and drive it with keypresses. Requires `WISDOM_GATE_KEY` for generation; honors `IMAGE_ENGINE_URL` (default `http://localhost:3002`) and optional `CLAUDE_BIN` for vision drafting.

```
just start            # bun run bin/pinboard
bun run bin/pinboard --smoke   # headless one-frame CI smoke check
```

## Natural flow (awareness only — the system drives this on the skill path)
1. **content-ingestion** — `p` imports a Pinterest pin URL; `a` adds local file(s)/clipboard images. References land in SQLite + `uploads/`, shown in the gallery as `@1`, `@2`, …
2. **image-generation** — draft a prompt (manual, `v` vision-draft from a reference, or `w` intent-based), pick a model (`m`) and aspect ratio (`r`), then `g` to generate via ImageEngine `POST /api/generate`.
3. **delivery** — the TUI renders Gallery / Preview / Prompt panes; `u` promotes a generation into the gallery to iterate.

## Where the agent must check / supply input
- **content-ingestion** — supply a **Pinterest URL** (`p`) or **file path(s)/clipboard image** (`a`); submit with Enter.
- **image-generation** — supply the **prompt** (typed, or seeded from a selected reference / intent phrase), choose **model** (`m`) and **aspect ratio** (`r`), then approve generation by pressing **`g`**.
- **delivery** — navigate panes (Tab + `j`/`k`), toggle reference intent (`t`), and decide which generation to keep (`u`).

## Validation
After execution, validate the output against [acceptance-criteria.md](acceptance-criteria.md) (hard gates inline, soft criteria via the validator). Applies to both drivers.
