# Pinboard — System Index

Mirror of the `pinboard` entry from `/systems.yaml` at repo root.

## Metadata

- **name**: Pinboard
- **status**: active
- **path**: `systems/pinboard`
- **description**: Terminal-first reference board and AI image generator (Ink TUI) — Pinterest URL import, ImageEngine generation, PromptWriter per-model prompt formatting, Claude Code vision tagging.
- **knowledge_path**: `systems/pinboard/knowledge`
- **entry_point**: `systems/pinboard/bin/pinboard`
- **justfile**: true
- **registered_at**: 2026-03-25
- **last_validated**: 2026-03-25

## Task Types

- image-generation
- reference-management
- visual-content

## Inputs / Outputs

- **input_types**: images, text-prompt
- **output_types**: generated-image, image-gallery

## Domain Tags

- tui
- ai
- image-generation
- visual

## Stages

| Stage | Produces |
|---|---|
| content-ingestion | Uploaded reference images stored in SQLite + uploads/ directory |
| image-generation | AI-generated image from prompt + reference images via provider registry |
| delivery | Ink TUI with gallery, prompt editor, and in-terminal image preview |
