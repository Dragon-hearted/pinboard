<div align="center">

# 🎨 Pinboard

### AI-Powered Image Generation Studio

Generate stunning images with multi-provider AI models, guided by your own reference images.

[![CI](https://github.com/adcelerate/pinboard/actions/workflows/ci.yml/badge.svg)](https://github.com/adcelerate/pinboard/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun&logoColor=000)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-e07a5f.svg)](LICENSE)

</div>

---

## 📽️ Demo

<div align="center">

### ✨ Welcome to Pinboard

<img src="./demo/out/scenes/01-title.gif" alt="Pinboard — AI-Powered Image Generation" width="720" />

---

### 📤 Upload Reference Images

Drag and drop your reference images directly into the panel to build your creative library.

<img src="./demo/out/scenes/02-upload.gif" alt="Upload reference images" width="720" />

---

### 🏷️ Smart @-Tag References

Type `@` in your prompt to tag reference images — autocomplete helps you pick the right one.

<img src="./demo/out/scenes/03-tagging.gif" alt="Smart tagging system" width="720" />

---

### 🤖 Multi-Model Generation

Switch between **NanoBanana Pro**, **SDXL**, and **FLUX Pro** — pick the best model for your vision.

<img src="./demo/out/scenes/04-multi-model.gif" alt="Multiple AI models" width="720" />

---

### 🎨 Generate & Iterate

Watch your images come to life in the 3-panel studio layout. Use any result as a new reference.

<img src="./demo/out/scenes/05-generation.gif" alt="Image generation" width="720" />

---

### 📜 Generation History

Browse and reuse your past generations — every creation is saved and searchable.

<img src="./demo/out/scenes/06-history.gif" alt="Generation history" width="720" />

---

### 🚀 Built with Modern Tech

<img src="./demo/out/scenes/07-closing.gif" alt="Tech stack" width="720" />

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multi-Provider AI** | Switch between Google AI Studio (Gemini 2.0 Flash), fal.ai (NanoBanana Pro, SDXL, FLUX Pro), and more coming soon |
| **Reference Image System** | Upload images and `@`-tag them in your prompts to guide generation |
| **Dual Reference Modes** | Choose per-image: send as **generation reference** (fed to the model) or **prompt-only** (context without pixels) |
| **3-Panel Studio Layout** | References + prompt (left) · canvas (center) · generation history (right) |
| **Autocomplete Tags** | Type `@` to get an autocomplete dropdown of your uploaded references — navigate with arrow keys |
| **Drag & Drop Upload** | Drop images directly onto the reference panel |
| **Use as Reference** | Promote any generated image back into your reference library with one click |
| **Generation History** | Browse, revisit, and compare all your past generations |
| **Warm Noir UI** | Hand-crafted dark theme with glass-morphism panels, grain texture, and a coral/sage accent palette |
| **Keyboard Shortcuts** | <kbd>Cmd/Ctrl</kbd>+<kbd>Enter</kbd> to generate · arrow keys in autocomplete |

---

## 🏗 Architecture

Pinboard is a **monorepo** with two packages — a Bun + Hono API server and a React + Vite client — communicating over a REST API.

```
┌────────────────────────────────────────────────────────────────────┐
│                        Pinboard Studio                             │
│                                                                    │
│  ┌──────────────┐   ┌──────────────────────┐   ┌───────────────┐  │
│  │  Left Panel   │   │    Center Canvas      │   │  Right Panel  │  │
│  │              │   │                      │   │               │  │
│  │  References  │   │  Generated Image     │   │  Generation   │  │
│  │  Uploader    │──▶│  Preview + Actions   │◀──│  History      │  │
│  │  Gallery     │   │                      │   │               │  │
│  │  Prompt      │   │                      │   │               │  │
│  └──────────────┘   └──────────────────────┘   └───────────────┘  │
│         │                     ▲                                    │
│         └─────────────────────┘                                    │
│                   REST API                                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Hono API Server (Bun)                     │  │
│  │                                                             │  │
│  │   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐   │  │
│  │   │  Images API  │   │ Generate API  │   │  Models API  │   │  │
│  │   └─────────────┘   └──────┬───────┘   └──────────────┘   │  │
│  │                            │                                │  │
│  │                 ┌──────────┴──────────┐                     │  │
│  │                 │  Provider Registry   │                     │  │
│  │                 ├──────────┬──────────┤                     │  │
│  │                 │ Google   │  fal.ai  │                     │  │
│  │                 │ (Gemini) │  (SDXL…) │                     │  │
│  │                 └──────────┴──────────┘                     │  │
│  │                                                             │  │
│  │   ┌──────────────────────────────────────────────────────┐ │  │
│  │   │            SQLite (WAL mode) + File Storage           │ │  │
│  │   └──────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Provider Architecture

The server uses a **registry pattern** with an abstract `ImageProvider` interface. Each provider (Google AI, fal.ai) registers its models at startup. Adding a new provider is as simple as implementing the interface and calling `registry.register()`.

---

## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **TypeScript 5.8** | Type safety |
| **Satoshi + DM Mono** | Typography (sans-serif + monospace) |

### Backend

| Technology | Purpose |
|------------|---------|
| **Bun** | JavaScript runtime & package manager |
| **Hono** | Lightweight web framework |
| **SQLite** | Database (WAL mode for concurrent access) |
| **@fal-ai/serverless-client** | fal.ai model integration |
| **@google/generative-ai** | Google AI Studio (Gemini) integration |

---

## 🚀 Getting Started

### Prerequisites

- [**Bun**](https://bun.sh/) v1.0+ — `curl -fsSL https://bun.sh/install | bash`
- At least one API key:
  - [**Google AI Studio**](https://aistudio.google.com/) — for NanoBanana (Gemini 2.0 Flash)
  - [**fal.ai**](https://fal.ai/) — for NanoBanana Pro, SDXL, FLUX Pro

### Install

```bash
# Clone the repository
git clone https://github.com/adcelerate/pinboard.git
cd pinboard

# Install all dependencies
just install
# — or manually —
cd server && bun install && cd ../client && bun install
```

### Configure

Create a `.env` file in the project root:

```env
GOOGLE_AI_STUDIO_KEY=your_google_ai_key
FAL_KEY=your_fal_ai_key
PORT=3001  # optional, defaults to 3001
```

### Run

```bash
just start
```

| Service | URL |
|---------|-----|
| Client  | http://localhost:5174 |
| Server  | http://localhost:3001 |

> [!TIP]
> Run `just` with no arguments to see all available commands.

---

## 💻 Development

This project uses [**just**](https://github.com/casey/just) as a command runner (like `make`, but better).

| Command | Description |
|---------|-------------|
| `just start` | Start both server and client |
| `just stop` | Stop all running services |
| `just install` | Install dependencies for both packages |
| `just server` | Start server only |
| `just client` | Start client only |

You can also use `bun run dev` from the project root to start both services.

---

## 📡 API Reference

All endpoints are prefixed with the server base URL (`http://localhost:3001`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/images/upload` | Upload a reference image (multipart form) |
| `GET` | `/api/images` | List all images |
| `GET` | `/api/images/:id` | Get image metadata |
| `GET` | `/api/images/:id/file` | Serve image file |
| `DELETE` | `/api/images/:id` | Delete an image |
| `POST` | `/api/generate` | Generate an image from a prompt + references |
| `GET` | `/api/generations` | List all generations |
| `GET` | `/api/generations/:id` | Get a single generation |
| `POST` | `/api/generations/:id/use-as-reference` | Copy a generation into the reference library |
| `GET` | `/api/models` | List available models and default model |

<details>
<summary><strong>Generate request body</strong></summary>

```json
{
  "prompt": "A serene mountain landscape at sunset",
  "model": "nanobanana",
  "generationRefIds": ["uuid-1", "uuid-2"],
  "promptOnlyRefIds": ["uuid-3"]
}
```

- `generationRefIds` — images sent as pixel data to the model
- `promptOnlyRefIds` — images referenced in the prompt for context only

</details>

---

## 📂 Project Structure

```
pinboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/            # API client functions
│   │   ├── components/     # React components
│   │   │   ├── Layout.tsx          # 3-panel layout shell
│   │   │   ├── PromptEditor.tsx    # Prompt input with @-tag autocomplete
│   │   │   ├── ReferenceGallery.tsx# Reference image grid
│   │   │   ├── ImageUploader.tsx   # Drag-and-drop upload
│   │   │   ├── GeneratedImage.tsx  # Canvas display + actions
│   │   │   ├── GenerationHistory.tsx# Right-panel history
│   │   │   ├── ModelSelector.tsx   # Model dropdown
│   │   │   └── ActionBar.tsx       # Action buttons
│   │   ├── hooks/          # Custom React hooks
│   │   ├── styles/         # Global CSS + Tailwind config
│   │   ├── types/          # TypeScript interfaces
│   │   └── App.tsx         # Root component
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                 # Bun + Hono backend
│   ├── src/
│   │   ├── providers/      # AI provider implementations
│   │   │   ├── base.ts             # ImageProvider interface re-export
│   │   │   ├── registry.ts         # Provider registry pattern
│   │   │   ├── google.ts           # Google AI Studio (Gemini)
│   │   │   └── fal.ts              # fal.ai (NanoBanana Pro, SDXL, FLUX)
│   │   ├── routes/         # API route handlers
│   │   │   ├── images.ts           # Image CRUD + file serving
│   │   │   ├── generate.ts         # Image generation + history
│   │   │   └── models.ts           # Model listing
│   │   ├── db.ts           # SQLite database (WAL mode)
│   │   ├── types.ts        # Shared TypeScript types
│   │   └── index.ts        # Server entry point
│   └── uploads/            # Stored images (gitignored)
├── .github/workflows/
│   └── ci.yml              # GitHub Actions CI pipeline
├── justfile                # Development commands
└── package.json            # Root workspace config
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_AI_STUDIO_KEY` | Yes* | Google AI Studio API key (for Gemini 2.0 Flash) |
| `FAL_KEY` | No | fal.ai API key (for NanoBanana Pro, SDXL, FLUX Pro) |
| `PORT` | No | Server port (default: `3001`) |

> *At least one provider key is required for image generation.

### Design Tokens

The UI uses a custom **warm noir** palette defined in CSS variables:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#141210` | App background |
| `--bg-panel` | `#1b1916` | Panel backgrounds |
| `--accent` | `#e07a5f` | Primary accent (coral) |
| `--sage` | `#7d9b82` | Secondary accent (sage green) |
| `--text-primary` | `#f0e6d8` | Main text color |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and ensure `just install && just start` works
4. Verify type checking passes: `cd server && bun run typecheck && cd ../client && bun run tsc -b`
5. Commit your changes and open a pull request

> [!NOTE]
> The CI pipeline runs type checking and a production build on every PR. Make sure both pass before submitting.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with** 🧡 **using Bun, Hono, React, and a lot of AI**

</div>
