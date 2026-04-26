<div align="center">

![Pinboard](images/hero.svg)

### Terminal-first reference board with built-in AI image generation

![Status](https://img.shields.io/badge/Status-active-brightgreen)

</div>

---

## 📽️ Demo

<div align="center">

<img src="./demo/out/scenes/01-title.gif" alt="out/scenes/title" width="720" />

<img src="./demo/out/scenes/02-upload.gif" alt="out/scenes/upload" width="720" />

<img src="./demo/out/scenes/03-tagging.gif" alt="out/scenes/tagging" width="720" />

<img src="./demo/out/scenes/04-multi-model.gif" alt="out/scenes/multi model" width="720" />

<img src="./demo/out/scenes/05-generation.gif" alt="out/scenes/generation" width="720" />

<img src="./demo/out/scenes/06-history.gif" alt="out/scenes/history" width="720" />

<img src="./demo/out/scenes/07-closing.gif" alt="out/scenes/closing" width="720" />

</div>

---

## 📑 Table of Contents

- [✨ Features](#features)
- [🏗 Architecture](#architecture)
- [🛠 Tech Stack](#tech-stack)
- [🚀 Getting Started](#getting-started)
- [💻 Development](#development)
- [📂 Project Structure](#project-structure)
- [🤝 Contributing](#contributing)
- [📄 License](#license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **image-generation** | Core task type |
| **reference-management** | Core task type |
| **visual-content** | Core task type |
| **images Input** | Supported input type |
| **text-prompt Input** | Supported input type |
| **generated-image Output** | Supported output type |
| **image-gallery Output** | Supported output type |

---

## 🏗 Architecture

![Pipeline](images/pipeline.svg)

Pinboard processes data through a multi-stage pipeline.

---

## 🚀 Getting Started

### Prerequisites

- [**Bun**](https://bun.sh/) v1.0+ — `curl -fsSL https://bun.sh/install | bash`
- [**Claude Code CLI**](https://claude.com/claude-code) — for vision-driven prompt drafting (`w` hotkey).
- *(optional)* [**chafa**](https://hpjansson.org/chafa/) — direct-pixel previews on terminals without Kitty/iTerm2 graphics. `brew install chafa` on macOS.

### Vision modes

By default, vision shells to the local `claude` CLI (no paid API). If the CLI
fails or is missing, the deterministic prompt-template fallback kicks in.

For guaranteed vision (paid), export both:

```bash
export PINBOARD_ALLOW_API=1
export ANTHROPIC_API_KEY=sk-ant-...
```

The SDK fallback only fires when both are set AND the CLI chain fails. Each
SDK call logs `vision: SDK fallback active (PINBOARD_ALLOW_API=1) — paid API call`
so you always see when you are billed.

### Key rotation

After editing `systems/image-engine/.env`, press capital **`R`** in pinboard to
restart the image-engine subprocess and reset the vision probe. See
`knowledge/key-rotation.md`.

### Install

```bash
cd systems/pinboard
bun install
```

### Run

```bash
bun run systems/pinboard/bin/pinboard
```

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
│   ├── out
│   │   └── video.mp4
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
│   └── index.md
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
