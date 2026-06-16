#!/usr/bin/env node
// Writes the released version into the manifests Claude Code and npm read.
// Invoked by semantic-release via @semantic-release/exec (prepareCmd); the
// updated files are then committed by @semantic-release/git. Plain Node (no Bun)
// so it runs in the Node-based release job.
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
  console.error("usage: sync-version.mjs <version>");
  process.exit(1);
}

const targets = [
  "package.json",
  "plugins/jrobic-cc-harness-setup-example/.claude-plugin/plugin.json",
];

for (const file of targets) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.version = version;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`synced ${file} -> ${version}`);
}
