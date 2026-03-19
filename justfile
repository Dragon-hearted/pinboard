# Pinboard
set dotenv-load := true

# List all recipes
default:
  @just --list

# ─── Development ────────────────────────────────────────

# Start Pinboard (server + client)
start:
  bun run dev:server &
  bun run dev:client &
  @echo "Pinboard started"
  @echo "  Client: http://localhost:5174"
  @echo "  Server: http://localhost:3001"

# Stop Pinboard
stop:
  -lsof -ti:3001 | xargs kill 2>/dev/null
  -lsof -ti:5174 | xargs kill 2>/dev/null
  @echo "Pinboard stopped"

# Install dependencies
install:
  cd server && bun install
  cd client && bun install

# ─── Individual Services ────────────────────────────────

# Start server only
server:
  cd server && bun run dev

# Start client only
client:
  cd client && bun run dev
