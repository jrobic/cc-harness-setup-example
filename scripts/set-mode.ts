#!/usr/bin/env bun
/**
 * set-mode.ts (optional) — flip the harness engine invocation between soft and hardened.
 *
 * Usage:
 *   bun run scripts/set-mode.ts soft      # hooks use: bun run <script>.ts
 *   bun run scripts/set-mode.ts hardened  # hooks use: dist/harness-setup binary
 *
 * What it patches:
 *   - plugins/.../hooks/hooks.json  (the SessionStart command)
 *
 * Hardened mode requires the binary to be built first:
 *   bun run scripts/build-hardened.ts
 *
 * Layout constraint: the hardened command resolves the binary relative to the
 * plugin root as `../../dist/harness-setup`, which only holds in a checked-out
 * repo (where `dist/` sits at the repo root next to `plugins/`). Once the plugin
 * is installed under `~/.claude/plugins/…`, no `dist/` exists there — hardened
 * mode is therefore a repo-local demo, not an install-time feature. (ADR-0003)
 *
 * Honesty caveat (ADR-0003, R10.4):
 *   Hardened mode is NOT enforcement. It only hardens the tooling against
 *   accidental edits to the TypeScript source. Real enforcement is the deny
 *   list in settings.json. The binary is not tamper-proof.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const hooksPath = join(root, "plugins", "jrobic-cc-harness-setup-example", "hooks", "hooks.json");

const SOFT_CMD =
  "bun run \"${CLAUDE_PLUGIN_ROOT}/scripts/harness-setup.ts\" check >/dev/null 2>&1; code=$?; [ $code -eq 3 ] && echo 'Harness: configuration incomplete — run /harness-setup to apply the recommended deny rules and context import.' || true";

const HARDENED_CMD =
  "\"${CLAUDE_PLUGIN_ROOT}/../../dist/harness-setup\" check >/dev/null 2>&1; code=$?; [ $code -eq 3 ] && echo 'Harness: configuration incomplete — run /harness-setup to apply the recommended deny rules and context import.' || true";

const mode = process.argv[2];

if (mode !== "soft" && mode !== "hardened") {
  console.error("Usage: bun run scripts/set-mode.ts <soft|hardened>");
  process.exit(2);
}

const raw = readFileSync(hooksPath, "utf8");
const hooks = JSON.parse(raw) as {
  hooks: {
    SessionStart: Array<{ hooks: Array<{ type: string; command: string; }>; }>;
  };
};

const sessionHooks = hooks.hooks.SessionStart[0]?.hooks;
if (!sessionHooks || sessionHooks.length === 0) {
  console.error("Unexpected hooks.json structure.");
  process.exit(2);
}

const newCmd = mode === "soft" ? SOFT_CMD : HARDENED_CMD;
const currentCmd = sessionHooks[0]!.command;

if (currentCmd === newCmd) {
  console.log(`Already in ${mode} mode — no change.`);
  process.exit(0);
}

sessionHooks[0]!.command = newCmd;
writeFileSync(hooksPath, JSON.stringify(hooks, null, 2) + "\n", "utf8");

console.log(`Switched hooks.json to ${mode} mode.`);
if (mode === "hardened") {
  console.log("Remember: build the binary first with `bun run scripts/build-hardened.ts`.");
  console.log("Note: hardened is not enforcement — see ADR-0003.");
}
