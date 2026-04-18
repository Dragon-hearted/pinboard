# Pinboard — Dependencies

## Runtime Stack

- **Bun** (runtime + package manager)
- **Ink 5** (React for terminals)
- **React 18**
- **@inkjs/ui** (Select, Spinner, etc.)
- **TypeScript 5**

## External Services

- **ImageEngine** — HTTP service at `$IMAGE_ENGINE_URL` (default `http://localhost:3002`). Exposes `POST /api/generate`.
- **WisGate** — accessed transitively via ImageEngine (Pinboard never talks to WisGate directly).
- **Claude CLI** — optional, invoked for vision-tagging when the user presses `v`.
- **Pinterest** — public URL fetch only (no auth, no API key).

## Environment Variables

| Var | Purpose |
|---|---|
| `WISDOM_GATE_KEY` | Provider key consumed downstream by ImageEngine |
| `IMAGE_ENGINE_URL` | Override the ImageEngine base URL |
| `CLAUDE_BIN` | Path to the Claude CLI for vision-tagging |

## Sibling Monorepo Systems

- `systems/image-engine` — upstream image generation service Pinboard posts to.
- `systems/prompt-writer` — shared PromptWriter templates applied per model before generation.
