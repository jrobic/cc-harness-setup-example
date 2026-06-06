#!/usr/bin/env bun
/**
 * harness-setup.ts — idempotent harness engine for Claude Code.
 *
 * Usage: bun run harness-setup.ts [check|apply]
 *   check   Audit only; never writes. Exit 0 = complete, 3 = incomplete.
 *   apply   Merge deny rules, write context, ensure import block. Exit 0 = applied.
 *   (no arg) defaults to check; unknown mode → exit 2.
 *
 * Writes ONLY to:
 *   <home>/.claude/settings.json   (permissions.deny field)
 *   <home>/.claude/CLAUDE.md       (managed import block)
 *   <home>/.claude/harness/CONTEXT.md  (embedded reference context)
 *
 * Exit codes (stable contract):
 *   0 — check: complete | apply: applied successfully
 *   2 — usage error (unknown mode) or invalid JSON in target settings.json
 *   3 — check: configuration incomplete (missing deny rule and/or import)
 *
 * Home resolution (R7):
 *   1. HARNESS_HOME env var if set (isolation override for tests / Docker)
 *   2. os.homedir() otherwise
 *
 * The engine is designed so main() returns the exit code (testable in-process);
 * the shebang wrapper at the bottom calls process.exit(await main(...)).
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Reference data is EMBEDDED at build time via imports. This is what makes the
// engine behave identically in soft mode (`bun run`) and as a compiled binary
// (`bun build --compile`), where sidecar files are not present on disk. Reading
// them from the filesystem instead would make the deny audit silently vacuous in
// the compiled binary. (R10.3, ADR-0003)
import refContextText from "../reference/CONTEXT.md" with { type: "text" };
import refDenyData from "../reference/deny.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const IMPORT_LINE = "@~/.claude/harness/CONTEXT.md";
export const BEGIN = "<!-- BEGIN harness (managed — do not edit) -->";
export const END = "<!-- END harness -->";

// ---------------------------------------------------------------------------
// Home resolution (R7)
// ---------------------------------------------------------------------------

/**
 * Resolves the target home directory from the environment.
 * If HARNESS_HOME is set, uses that; otherwise falls back to os.homedir().
 * This is the single seam that makes tests and Docker demos safe.
 */
export function resolveHome(env: Record<string, string | undefined>): string {
  return env["HARNESS_HOME"] ?? homedir();
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

/**
 * Reads and parses a JSON file.
 * - Returns {} if the file is absent or empty (R1.5).
 * - Returns null if the JSON is invalid — caller handles the exit-2 path.
 */
export function readJson(
  path: string,
): Record<string, unknown> | null {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Reads a text file, returning "" if absent (R1.5).
 */
export function readText(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

/**
 * Copies a file to <path>.bak-<ISO-timestamp> if it exists (R6.1).
 * Does nothing if the file does not exist (R6.2).
 */
export function backup(path: string): void {
  if (!existsSync(path)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  copyFileSync(path, `${path}.bak-${stamp}`);
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Returns the subset of refDeny rules not already present in currentDeny (R2.1, R4.1).
 */
export function computeMissingDeny(
  refDeny: string[],
  currentDeny: string[],
): string[] {
  return refDeny.filter((rule) => !currentDeny.includes(rule));
}

/**
 * Ensures exactly one managed import block exists in the given CLAUDE.md content.
 *
 * Rules (R2.3, R3.2, R3.3, R5.1, R5.2):
 * - If a managed block (BEGIN…END) already exists, replace it in place.
 * - If the import line exists outside the markers, leave the file unchanged
 *   (do not add a second import).
 * - Otherwise append the block after existing content (separated by a blank
 *   line if the file is non-empty).
 *
 * Returns the new content (may equal the input if no change is needed).
 */
export function ensureImportBlock(claudeMd: string): string {
  const block = `${BEGIN}\n${IMPORT_LINE}\n${END}`;

  const beginIdx = claudeMd.indexOf(BEGIN);
  const endIdx = claudeMd.indexOf(END);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    // Managed block already present — replace it in place (idempotent).
    return claudeMd.slice(0, beginIdx) + block + claudeMd.slice(endIdx + END.length);
  }

  if (claudeMd.includes(IMPORT_LINE)) {
    // Import line already present outside the markers — do not duplicate (R3.3).
    return claudeMd;
  }

  // Append block, separated by a blank line when the file is non-empty (R5.2).
  const head = claudeMd.trimEnd();
  return (head ? head + "\n\n" : "") + block + "\n";
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/**
 * Prints an audit summary to stdout.
 */
export function report(missing: string[], importPresent: boolean): void {
  console.log("Harness — configuration status\n");
  if (missing.length === 0) {
    console.log("  ✓ deny list: up to date");
  } else {
    console.log(`  ✗ deny list: ${missing.length} missing rule(s):`);
    for (const rule of missing) {
      console.log(`      - ${rule}`);
    }
  }
  console.log(
    importPresent
      ? "  ✓ CLAUDE.md context: import present"
      : `  ✗ CLAUDE.md context: import absent (${IMPORT_LINE})`,
  );
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrates check or apply; returns the exit code.
 * Accepts an env map so it can be called in-process from tests (R7, Design §3).
 */
export async function main(
  mode: string,
  env: Record<string, string | undefined> = {},
): Promise<number> {
  const effectiveMode = mode || "check";

  if (effectiveMode !== "check" && effectiveMode !== "apply") {
    console.error(`Unknown mode: "${mode}" (expected: check | apply)`);
    return 2;
  }

  // Resolve paths
  const home = resolveHome(env);
  const claudeDir = join(home, ".claude");
  const settingsPath = join(claudeDir, "settings.json");
  const claudeMdPath = join(claudeDir, "CLAUDE.md");
  const harnessDir = join(claudeDir, "harness");
  const contextDestPath = join(harnessDir, "CONTEXT.md");

  // Reference deny rules — embedded at build time (see imports above), so this
  // is identical whether run with `bun run` or as a compiled binary. (R10.3)
  const refDeny = (refDenyData as { deny?: string[]; }).deny ?? [];

  // Read current state
  const currentSettings = readJson(settingsPath);
  if (currentSettings === null) {
    console.error(`Error: invalid JSON in ${settingsPath}`);
    return 2;
  }
  const permissions = (currentSettings["permissions"] as Record<string, unknown> | undefined) ?? {};
  const currentDeny = (permissions["deny"] as string[] | undefined) ?? [];

  const claudeMd = readText(claudeMdPath);

  const missingDeny = computeMissingDeny(refDeny, currentDeny);
  const importPresent = claudeMd.includes(IMPORT_LINE);

  // --- CHECK ---------------------------------------------------------------
  if (effectiveMode === "check") {
    report(missingDeny, importPresent);
    return missingDeny.length === 0 && importPresent ? 0 : 3;
  }

  // --- APPLY ---------------------------------------------------------------

  // 1) Deny list — merge (concat + dedup), touch nothing else (R2.1, R4.2, R4.3)
  if (missingDeny.length > 0) {
    mkdirSync(claudeDir, { recursive: true });
    backup(settingsPath);
    const updatedSettings = {
      ...currentSettings,
      permissions: {
        ...(currentSettings["permissions"] as Record<string, unknown> | undefined),
        deny: [...currentDeny, ...missingDeny],
      },
    };
    writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2) + "\n", "utf8");
  }

  // 2) Context file — write embedded reference to <home>/.claude/harness/CONTEXT.md (R2.2, R5.3)
  mkdirSync(harnessDir, { recursive: true });
  writeFileSync(contextDestPath, refContextText, "utf8");

  // 3) CLAUDE.md — ensure exactly one managed import block (R2.3, R3.2, R5.1)
  const newClaudeMd = ensureImportBlock(claudeMd);
  if (newClaudeMd !== claudeMd) {
    backup(claudeMdPath);
    writeFileSync(claudeMdPath, newClaudeMd, "utf8");
  }

  // Only the deny merge and the CLAUDE.md import block create backups; the
  // managed context file is overwritten by design and is not backed up.
  const backedUp: string[] = [];
  if (missingDeny.length > 0) backedUp.push("settings.json");
  if (newClaudeMd !== claudeMd) backedUp.push("CLAUDE.md");
  console.log(
    backedUp.length > 0
      ? `✓ Harness applied. Backups (.bak-…) created for: ${backedUp.join(", ")}.\n`
      : "✓ Harness applied (no changes needed).\n",
  );

  const finalImportPresent = newClaudeMd.includes(IMPORT_LINE);
  report([], finalImportPresent);

  return 0;
}

// ---------------------------------------------------------------------------
// CLI entry point (shebang wrapper — only runs when executed directly)
// ---------------------------------------------------------------------------

// Bun sets import.meta.main = true when the file is the entry point.
if (import.meta.main) {
  const mode = process.argv[2] ?? "check";
  const exitCode = await main(mode, process.env as Record<string, string | undefined>);
  process.exit(exitCode);
}
