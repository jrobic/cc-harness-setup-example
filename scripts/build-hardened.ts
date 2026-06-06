#!/usr/bin/env bun
/**
 * build-hardened.ts — compile the harness engine to a standalone binary.
 *
 * Usage:
 *   bun run scripts/build-hardened.ts              # native platform binary
 *   bun run scripts/build-hardened.ts bun-linux-x64  # cross-build (see --target below)
 *
 * The output binary is written to dist/harness-setup (gitignored).
 *
 * Cross-build targets (pass as first CLI argument):
 *   bun-darwin-arm64   macOS Apple Silicon
 *   bun-darwin-x64     macOS Intel
 *   bun-linux-x64      Linux x86-64 (CI / Docker)
 *   bun-linux-arm64    Linux ARM64
 *   bun-windows-x64    Windows x64 (experimental)
 *
 * Honesty caveat (ADR-0003, R10.4):
 *   The compiled binary is NOT enforcement. It only hardens the tooling against
 *   accidental or trivial edits to the TypeScript source. Real enforcement is the
 *   deny list in settings.json — and only the managed scope is non-bypassable.
 *   Never describe this binary as tamper-proof or unmodifiable.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const engine = join(
  root,
  "plugins",
  "jrobic-cc-harness-setup-example",
  "scripts",
  "harness-setup.ts",
);
const outDir = join(root, "dist");
const outFile = join(outDir, "harness-setup");

// Optional cross-build target passed as first CLI arg
const target = process.argv[2] ?? undefined;

mkdirSync(outDir, { recursive: true });

const args = [
  "build",
  "--compile",
  `--outfile=${outFile}`,
];
if (target) {
  args.push(`--target=${target}`);
}
args.push(engine);

console.log(`Building hardened binary: dist/harness-setup`);
if (target) {
  console.log(`  Target: ${target}`);
}
console.log(`  Source: ${engine}`);

const result = spawnSync("bun", args, { stdio: "inherit", cwd: root });

if (result.status !== 0) {
  console.error("Build failed.");
  process.exit(result.status ?? 1);
}

console.log(`\nBinary written to: ${outFile}`);
console.log("Done. Remember: this binary is not enforcement — see ADR-0003.");
