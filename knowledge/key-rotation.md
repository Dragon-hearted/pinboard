# Key rotation

The image-engine subprocess reads `WISDOM_GATE_KEY` from `.env` on every
generate / balance call — there is no in-memory cache and no `process.env`
fallback. So a stale key in the running subprocess is impossible as long
as the file on disk is fresh.

## Rotating the key

1. Edit `systems/image-engine/.env` and update `WISDOM_GATE_KEY=...`.
2. In pinboard, press capital **`R`** to reload tools.

`R` does two things:

- **Restarts the image-engine subprocess.** `services/imageengine.ts:restart()`
  finds the process listening on port 3002 (`lsof -i:3002 -t`), sends `kill`,
  waits for the port to free, and re-runs `ensureUp()`. The new subprocess
  picks up any other env-only changes (port, log path, etc.) at the same time.
- **Invalidates the Claude vision probe cache.** `claudevision.ts` caches the
  result of `claude --version` / `--help` for the lifetime of the pinboard
  process so repeated `w` presses do not respawn the binary check. After a
  `claude` upgrade or auth change, the cache must be cleared so the next
  vision call re-probes.

## Why the explicit hotkey

The image-engine subprocess is detached (`child.unref()`) so pinboard does
not own its lifetime. Polling its config files automatically would mean
either (a) restarting the subprocess on every `.env` write, which thrashes
the API client, or (b) reading the env file on every API call from
pinboard's side, which leaks the responsibility.

A single user-driven action keeps the contract clean: edit, hit R, generate.

## What if `R` does nothing visible

The status bar flashes `Tools reloaded — fresh keys + vision probe` on
success. If you see `Reload failed: …` instead:

- `lsof` not in PATH → kill `bun` listening on `:3002` manually, then
  generate (pinboard will respawn it on the next request).
- WisGate auth failure → check `.env` actually contains `WISDOM_GATE_KEY=...`
  and the value is the rotated key, not the old one. The subprocess always
  reads from disk; if the disk has the old value, the subprocess will too.
