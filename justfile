# Pinboard
set dotenv-load := true

# List all recipes
default:
  @just --list

# ─── Development ────────────────────────────────────────

# Start Pinboard TUI
start:
  bun run bin/pinboard

# Alias for `start`
tui:
  bun run bin/pinboard

# Install dependencies
install:
  bun install

# ─── Tests / Typecheck ──────────────────────────────────

# Run TUI test suite
tui-test:
  cd tui && bun test

# Typecheck the TUI package
typecheck:
  cd tui && bun run typecheck
