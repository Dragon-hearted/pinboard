#!/usr/bin/env bun
import { render } from "ink";
import { App } from "./App.tsx";

const VERSION = "0.1.0";
const argv = process.argv.slice(2);

if (argv.includes("--help") || argv.includes("-h")) {
  process.stdout.write(
    [
      "pinboard — Warp-styled terminal UI for reference → generate → iterate",
      "",
      "Usage: pinboard [options]",
      "",
      "Options:",
      "  --help, -h       Show this help and exit",
      "  --version, -v    Show version and exit",
      "  --ci             Render one frame and exit (smoke test)",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

if (argv.includes("--version") || argv.includes("-v")) {
  process.stdout.write(`pinboard ${VERSION}\n`);
  process.exit(0);
}

const ci = argv.includes("--ci");
const instance = render(<App />);

if (ci) {
  setTimeout(() => {
    instance.unmount();
    process.exit(0);
  }, 150);
}
