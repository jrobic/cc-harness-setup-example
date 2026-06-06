/**
 * tmp-home.ts — isolated HOME builder for engine tests.
 *
 * Creates a temporary directory that mimics `~/.claude/` so the engine
 * can be pointed at it via `HARNESS_HOME` without ever touching the
 * operator's real home. (R7, R13.2)
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TmpHome {
  /** The root home directory (value to set as HARNESS_HOME). */
  home: string;
  /** `<home>/.claude/settings.json` */
  settingsPath: string;
  /** `<home>/.claude/CLAUDE.md` */
  claudeMdPath: string;
  /** `<home>/.claude/harness/CONTEXT.md` (written by engine on apply) */
  contextDestPath: string;
}

export interface SeedOptions {
  /** Raw JSON string to write into settings.json. Omit to leave the file absent. */
  settingsJson?: string;
  /** Content to write into CLAUDE.md. Omit to leave the file absent. */
  claudeMd?: string;
}

/**
 * Creates an isolated temp HOME directory, optionally seeding files inside it.
 *
 * Usage:
 *   const tmp = createTmpHome({ settingsJson: '{"permissions":{"deny":[]}}' });
 *   // use tmp.home as HARNESS_HOME in engine invocations
 */
export function createTmpHome(seed: SeedOptions = {}): TmpHome {
  const home = mkdtempSync(join(tmpdir(), "harness-test-"));
  const claudeDir = join(home, ".claude");
  mkdirSync(claudeDir, { recursive: true });

  const settingsPath = join(claudeDir, "settings.json");
  const claudeMdPath = join(claudeDir, "CLAUDE.md");
  const contextDestPath = join(claudeDir, "harness", "CONTEXT.md");

  if (seed.settingsJson !== undefined) {
    writeFileSync(settingsPath, seed.settingsJson, "utf8");
  }

  if (seed.claudeMd !== undefined) {
    writeFileSync(claudeMdPath, seed.claudeMd, "utf8");
  }

  return { home, settingsPath, claudeMdPath, contextDestPath };
}
