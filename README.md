<div align="center">

![Pinboard](images/hero.svg)

### Terminal-first reference board with built-in AI image generation

![Status](https://img.shields.io/badge/Status-active-brightgreen)

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🏗 Architecture](#-architecture)
- [🚀 Getting Started](#-getting-started)
- [🚀 Usage](#-usage)
- [⚙️ Configuration](#️-configuration)
- [💻 Development](#-development)
- [📂 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Pinterest pin import** | Press `p` to paste a public pinterest.com/pin/… or pin.it/… URL; the highest-resolution image (og:image → twitter:image → largest <img>) is downloaded (10 MB cap) and stored as a reference. No login or API key. |
| **Local & clipboard reference add** | Press `a` to add image references by path. Supports multi-path paste, drag-and-drop, and Ctrl/Cmd+V clipboard-image paste. |
| **ImageEngine generation** | Press `g` to generate from the current prompt + tagged-INPUT refs. Posts to ImageEngine `POST /api/generate`; auto-spawns the engine subprocess if it isn't already listening on :3002. |
| **PromptWriter per-model templating** | Before sending, the draft is massaged per selected model — NanoBanana models get a trailing 'No text in image.' and every prompt is truncated to the model's character cap (default 8192) on a word boundary. |
| **Claude Code vision prompt drafting** | Type intent in the Intent box and press `w` to draft a complete prompt from intent + reference images. Shells out to the local `claude` CLI (no paid API); cascades to the Anthropic SDK only if PINBOARD_ALLOW_API=1, then to a deterministic template. |
| **Reference intent toggle** | Press `t` to flip the highlighted ref between IN (sent to the image model as a reference) and DRAFT (seen only by vision when drafting the prompt, never sent to the model). |
| **Promote generation to gallery** | Press `u` to promote the latest generation into the gallery as a new reference, enabling iterate-on-output loops. |
| **Aspect-ratio picker** | Press `r` to choose from 15 ratios (Auto, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9, 1:4, 4:1, 1:8, 8:1). |
| **Model picker** | Press `m` to pick the image model. Only models registered in PromptWriter AND served by ImageEngine's WisGate union are listed (NanoBanana Pro/Flash/Flash 2.5). |
| **Reload tools / key rotation** | Press capital `R` after rotating WISDOM_GATE_KEY in .env: restarts the ImageEngine subprocess, re-reads .env files, and invalidates the Claude vision probe cache. See knowledge/key-rotation.md. |
| **In-terminal image preview** | Gallery and Preview panes render thumbnails inline via the terminal image protocol; Tab cycles gallery → prompt → preview; in Preview, j/k step generations and End jumps to newest. |
| **SQLite board storage** | WAL-enabled SQLite at pinboard.db with two tables: references/images (source='upload' \| 'pinterest') and generations. Gallery removal (`d`, `x`/`X`) is a soft-delete — files under uploads/ are preserved on disk. |
| **Live budget readout** | Polls ImageEngine `GET /api/budget` every 10s and after each generation; budget + engine up/down status shown in the status bar. |
| **CI smoke test** | `pinboard --smoke` renders one frame to stderr and exits 0 ('ok'), so the TUI can be booted headlessly in CI without a TTY. |

---

## 🏗 Architecture

![Pipeline](images/pipeline.svg)

Pinboard processes data through a multi-stage pipeline.

---

## 🚀 Getting Started

### Prerequisites

- Bun v1.0+ — curl -fsSL https://bun.sh/install | bash
- ImageEngine sibling service (systems/image-engine) running on :3002 — Pinboard auto-spawns it, or start manually: cd systems/image-engine && bun run src/index.ts
- PromptWriter sibling (systems/prompt-writer) — provides the per-model prompt guides and registry; resolved via relative path at runtime
- claude CLI (optional) — enables `w`/`v` vision drafting with no paid API; auto-detected on PATH or in ~/.claude/local, Homebrew, /usr/local/bin
- An interactive terminal (both stdin and stdout must be a TTY) — the TUI refuses to launch when piped; use --smoke for headless checks

### Install

```bash
cd systems/pinboard
bun install
```

---

## 🚀 Usage

### 1. Install dependencies

```bash
cd systems/pinboard && bun install
```

> **Expected:** Checks ~157 packages and exits 0 (verified: 'Done! Checked 157 packages').

### 2. Show help and flags

```bash
bun run bin/pinboard --help
```

> **Expected:** Prints usage, the five flags (--help, --version, --smoke, --smoke-timeout-ms, --no-color), examples, and exits 0. (verified)

### 3. Print version

```bash
bun run bin/pinboard --version
```

> **Expected:** Prints 'pinboard 0.2.0' and exits 0. (verified)

### 4. Headless smoke test (CI)

```bash
bun run bin/pinboard --smoke
```

> **Expected:** Renders one frame to stderr, prints 'ok' to stdout, exits 0. (verified)

### 5. Launch the interactive TUI

```bash
just start    # or: bun run bin/pinboard
```

> **Expected:** interactive TUI — launch manually. Opens the Ink reference board (Gallery · Preview · Prompt panes). Refuses to start without a TTY (exit 2).

### 6. Import a Pinterest reference

```bash
Press 'p' in the TUI, paste a pinterest.com/pin/… or pin.it/… URL
```

> **Expected:** interactive TUI — launch manually. Downloads the pin image into uploads/ and inserts a reference row (source='pinterest').

### 7. Add a local image reference

```bash
Press 'a' in the TUI, paste one or more file paths (or Ctrl/Cmd+V a clipboard image)
```

> **Expected:** interactive TUI — launch manually. Stores each image as a reference (source='upload').

### 8. Draft a prompt from intent + references

```bash
Type intent in the Intent box, press 'w'
```

> **Expected:** interactive TUI — launch manually. Requires the claude CLI (or PINBOARD_ALLOW_API=1 + ANTHROPIC_API_KEY) — falls back to a deterministic template when vision is unavailable. Fills the prompt textarea.

### 9. Pick a model and aspect ratio

```bash
Press 'm' (model), then 'r' (aspect ratio)
```

> **Expected:** interactive TUI — launch manually. Model list limited to NanoBanana Pro/Flash/Flash 2.5; 15 aspect-ratio options.

### 10. Generate an image

```bash
Press 'g'
```

> **Expected:** interactive TUI — requires WISDOM_GATE_KEY + ImageEngine on :3002 — not executed in recon. Applies the PromptWriter template, POSTs /api/generate, renders the result in the Preview pane, refreshes budget.

### 11. Rotate keys / reload tools

```bash
Edit systems/image-engine/.env (WISDOM_GATE_KEY=…), then press capital 'R'
```

> **Expected:** interactive TUI — launch manually. Restarts the ImageEngine subprocess, re-reads .env, invalidates the vision probe cache; status bar flashes the updated keys.

### Command Reference

| Command | Description |
|---------|-------------|
| `bun run bin/pinboard --help` | Show help and all flags, then exit. |
| `bun run bin/pinboard --version` | Print version (pinboard 0.2.0) and exit. |
| `bun run bin/pinboard --smoke` | Render one frame and exit 0 — headless CI smoke test (TTY not required). |
| `bun run bin/pinboard --smoke-timeout-ms <n>` | Override the smoke-test render timeout (default 150ms; integer only). |
| `bun run bin/pinboard --no-color` | Disable ANSI color output (sets NO_COLOR / FORCE_COLOR=0). |
| `just start    # alias: just tui` | Launch the interactive Pinboard TUI (= bun run bin/pinboard). |
| `just install` | Install dependencies (bun install). |
| `just tui-test    # or: cd tui && bun test` | Run the Ink TUI test suite. |
| `just typecheck    # or: cd tui && bun run typecheck` | Typecheck the TUI package. |

---

## ⚙️ Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `IMAGE_ENGINE_URL` | No | Base URL of the ImageEngine service. Default http://localhost:3002. |
| `WISDOM_GATE_KEY` | Yes | WisGate provider key consumed downstream by ImageEngine for generation. Pinboard never calls WisGate directly; the engine re-reads it from .env on every call. |
| `PINBOARD_ALLOW_API` | No | Set to 1 to opt into the paid Anthropic SDK vision fallback when the local claude CLI chain fails. Default off. |
| `ANTHROPIC_API_KEY` | No | Anthropic key used only by the opt-in SDK vision fallback (PINBOARD_ALLOW_API=1). Billed against your account. |
| `CLAUDE_BIN` | No | Override path to the claude CLI binary used for vision drafting. Defaults to `claude` on PATH with known-location fallbacks. |
| `PINBOARD_SMOKE_TIMEOUT_MS` | No | Override the --smoke render timeout in milliseconds (default 150). The --smoke-timeout-ms flag takes precedence. |

---

## 💻 Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development mode |
| `bun run build` | Build for production |
| `bun test` | Run tests |
| `bun run lint` | Check code quality |

---

## 📂 Project Structure

```
pinboard/
├── README.md
├── bin
│   └── pinboard
├── demo
│   ├── package.json
│   ├── src
│   │   ├── Main.tsx
│   │   ├── Root.tsx
│   │   ├── index.ts
│   │   └── theme.ts
│   └── tsconfig.json
├── images
│   ├── hero.svg
│   └── pipeline.svg
├── justfile
├── knowledge
│   ├── acceptance-criteria.md
│   ├── dependencies.md
│   ├── domain.md
│   ├── history.md
│   ├── index.md
│   └── key-rotation.md
├── package.json
└── tui
    ├── package.json
    ├── src
    │   ├── App.tsx
    │   ├── cli.tsx
    │   └── theme.ts
    └── tsconfig.json
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and ensure tests pass
4. Commit your changes and open a pull request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with** 🧡 **using Bun, TypeScript**

</div>
