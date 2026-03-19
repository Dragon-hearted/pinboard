# Pinboard

AI-powered image generation app with reference image support. Built with a dark theme UI.

## Overview

Pinboard lets users generate images using the NanoBanana Pro model via the fal.ai API. Users can upload reference images to guide generation, organize results on a visual pinboard, and iterate on their creations.

## Architecture

- **Server** (`server/`) -- Bun + Hono API server with SQLite persistence and fal.ai integration
- **Client** (`client/`) -- React + Vite frontend with a dark theme UI

## Getting Started

1. Copy `.env.example` to `.env` and add your fal.ai API key
2. Install dependencies: `bun install` in both `server/` and `client/`
3. Run the dev servers: `bun run dev`

The server runs on port 3001 and the client on port 5173 by default.
