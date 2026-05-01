#!/usr/bin/env bun
import { parseArgs } from "node:util";

const VERSION = "0.2.0";

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean" },
      smoke: { type: "boolean" },
      ci: { type: "boolean" },
      "smoke-timeout-ms": { type: "string" },
      "no-color": { type: "boolean" },
    },
    strict: true,
    allowPositionals: true,
  });
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`pinboard: ${msg}\nRun 'pinboard --help' for usage.\n`);
  process.exit(2);
}

const { values } = parsed;

const HELP = [
  "pinboard — Terminal-first reference board with built-in AI image generation",
  "",
  "USAGE",
  "  pinboard [flags]",
  "",
  "FLAGS",
  "  -h, --help                  Show help and exit",
  "      --version               Show version and exit",
  "      --smoke                 Render one frame and exit (CI smoke test)",
  "      --smoke-timeout-ms <n>  Override smoke-test timeout (default: 150)",
  "      --no-color              Disable ANSI color output",
  "",
  "EXAMPLES",
  "  # Launch the interactive pinboard TUI",
  "  $ pinboard",
  "",
  "  # Verify the TUI boots in CI",
  "  $ pinboard --smoke",
  "",
  "  # Enable paid vision fallback (see README → Vision modes)",
  "  $ PINBOARD_ALLOW_API=1 ANTHROPIC_API_KEY=sk-ant-... pinboard",
  "",
  "LEARN MORE",
  "  Manual:        systems/pinboard/README.md",
  "  Vision modes:  systems/pinboard/knowledge/",
  "",
  "FEEDBACK",
  "  File an issue at the Adcelerate repo's GitHub issues page.",
  "",
].join("\n");

// Flag precedence: --help wins over --version, which wins over --smoke/--ci.
if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

if (values.version) {
  process.stdout.write(`pinboard ${VERSION}\n`);
  process.exit(0);
}

// --ci is a hidden alias for --smoke kept for one release for backwards compat.
const smoke = Boolean(values.smoke || values.ci);

const envTimeout = process.env.PINBOARD_SMOKE_TIMEOUT_MS;
const flagTimeout = values["smoke-timeout-ms"];
const rawTimeout = flagTimeout ?? envTimeout;
const parsedTimeout = rawTimeout !== undefined ? parseInt(rawTimeout, 10) : NaN;
const smokeTimeoutMs =
  Number.isFinite(parsedTimeout) && parsedTimeout >= 0 ? parsedTimeout : 150;

if (values["no-color"]) {
  process.env.FORCE_COLOR = "0";
  process.env.NO_COLOR = "1";
}

if (!process.stdout.isTTY && !smoke) {
  process.stderr.write(
    "pinboard: refusing to launch TUI on a non-TTY stdout. " +
      "Hint: run in an interactive terminal, or use --smoke for a smoke test.\n",
  );
  process.exit(2);
}

const { render } = await import("ink");
const { App } = await import("./App.tsx");

const instance = smoke
  ? render(<App />, { stdout: process.stderr })
  : render(<App />);

const cleanup = (code: number) => {
  instance.unmount();
  process.exit(code);
};
process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

if (smoke) {
  setTimeout(() => {
    instance.unmount();
    process.stdout.write("ok\n");
    process.exit(0);
  }, smokeTimeoutMs);
}
