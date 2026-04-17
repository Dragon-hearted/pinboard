<div align="center">

![Pinboard](images/hero.svg)

### Terminal-first reference board and AI image generator — Pinterest import, ImageEngine generation, PromptWriter optimization, all from your shell

![Status](https://img.shields.io/badge/Status-active-brightgreen)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![Ink](https://img.shields.io/badge/Ink-5-black)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=000)
[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun&logoColor=000)](https://bun.sh/)

</div>

---

Pinboard is a terminal application for collecting visual references and
generating new images from them. The rewrite replaced the original React +
Hono web app with a Warp-styled Ink TUI that runs entirely inside your
terminal — no browser, no dev server, no localhost port.

The old web client and server are preserved under `.legacy/` for rollback
reference only and will be deleted after the TUI has proven parity in daily
use.

---

## 📑 Table of Contents

- [✨ What it does](#what-it-does)
- [🚀 Launch](#launch)
- [⌨️ Keybindings](#keybindings)
- [🧱 Dependencies](#dependencies)
- [📌 Pinterest flow](#pinterest-flow)
- [⚙️ Configuration](#configuration)
- [🧪 Development](#development)
- [📂 Project Structure](#project-structure)
- [📄 License](#license)

---

## ✨ What it does

| Capability | Notes |
|------------|-------|
| **Reference board** | Manage local image references with tags and metadata in a SQLite-backed board. |
| **Pinterest import** | Paste a Pinterest board or pin URL and Pinboard pulls the referenced images into the board. |
| **AI image generation** | Generation runs through **ImageEngine** (WisGate / NanoBanana) with budget guards and rate limiting. |
| **Prompt optimization** | Prompts are composed through **PromptWriter**, which enforces per-model best practices. |
| **Vision tagging** | Optional auto-tagging and description via **Claude Code CLI** (no extra API key). |
| **In-terminal previews** | Renders images inline in Kitty, Ghostty, iTerm2, and WezTerm; falls back to ASCII elsewhere. |

---

## 🚀 Launch

From the monorepo root:

```bash
bun run systems/pinboard/bin/pinboard
```

From inside `systems/pinboard/`:

```bash
./bin/pinboard
# or
just start
```

On first launch Pinboard creates `pinboard.db` in the working directory and
opens on the board screen.

---

## ⌨️ Keybindings

| Key | Action |
|-----|--------|
| `j` `k` / `↑` `↓` | Move selection in the gallery |
| `Tab` | Switch focus between gallery and prompt |
| `Enter` | Confirm input / commit draft |
| `a` | Add a local file as a reference |
| `p` | Import from a Pinterest URL |
| `v` | Draft a prompt from the highlighted reference via Claude vision |
| `g` | Generate via ImageEngine using the current prompt |
| `r` | Use the highlighted generation as a new reference |
| `m` | Open the model picker |
| `?` | Toggle help overlay |
| `Esc` | Close modal / cancel |
| `q` | Quit |

The help overlay (`?`) is the source of truth — the table above is a quick
reference.

---

## 🧱 Dependencies

Pinboard composes three internal systems plus one external CLI:

| Dependency | Role | Required |
|------------|------|----------|
| [**ImageEngine**](../image-engine) | Image generation via WisGate / NanoBanana with budget + rate limiting. | Yes |
| [**PromptWriter**](../prompt-writer) | Per-model prompt composition and validation. | Yes |
| **Claude Code CLI** (`claude`) | Vision tagging and descriptions (runs as a subprocess). | Optional |

ImageEngine runs as an HTTP service (default `http://localhost:3002`) — start
it in its own terminal before generating. PromptWriter is consumed as a
library. The Claude CLI is invoked only when you run vision tagging.

---

## 📌 Pinterest flow

1. Press `p` on the board screen and paste a Pinterest pin or board URL.
2. Pinboard fetches the pin metadata and downloads the referenced images into
   your board, deduplicated by source URL.
3. Newly imported references appear on the board ready for selection,
   tagging, or generation.

No Pinterest login is required — only the public image URLs referenced by
the pin page are fetched.

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in what you need. Recognized keys:

| Variable | Purpose |
|----------|---------|
| `WISDOM_GATE_KEY` | WisGate API key consumed by ImageEngine. Required for generation. |
| `IMAGE_ENGINE_URL` | URL of the running ImageEngine service. Defaults to `http://localhost:3002`. |
| `CLAUDE_BIN` | Path to the Claude Code CLI. Optional — defaults to `claude` on `$PATH`. |

Legacy web-only variables (`GOOGLE_AI_STUDIO_KEY`, `FAL_KEY`) are no longer
read by the TUI. If you are running anything under `.legacy/` you will need
to restore them in a separate `.env`.

---

## 🧪 Development

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the TUI (alias for `bun run bin/pinboard`). |
| `just tui-test` | Run the TUI test suite. |
| `bun run typecheck` | Typecheck the TUI package. |
| `bun run systems/pinboard/bin/pinboard --ci` | Smoke-render the TUI in CI mode (no interactive input). |

---

## 📂 Project Structure

```
pinboard/
├── README.md
├── bin/
│   └── pinboard            # bun entry shim — imports tui/src/cli.tsx
├── tui/                    # Ink-based terminal UI (active runtime)
│   └── src/
│       ├── App.tsx
│       ├── cli.tsx
│       ├── components/
│       ├── hooks/
│       ├── screens/
│       ├── services/       # imageengine, promptwriter, claudevision, pinterest, db
│       └── utils/
├── demo/                   # Remotion demo video (unrelated to app runtime)
├── images/                 # README assets
├── .legacy/                # Retired web client + server — see .legacy/README.md
│   ├── README.md
│   ├── client/             # React 19 + Vite (retired)
│   └── server/             # Hono 4 API (retired)
├── justfile
├── package.json
└── pinboard.db             # SQLite store (created on first launch)
```

---

## 📄 License

This project is licensed under the [MIT License](../../LICENSE).

---

<div align="center">

**Built with** 🧡 **using Bun, Ink, TypeScript, ImageEngine, PromptWriter**

</div>
