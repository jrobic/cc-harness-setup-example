/**
 * harness-setup.backup.test.ts — backup creation behaviour.
 *
 * Covers R4.3, R6.1, R6.2:
 * - .bak-<timestamp> created when a file is modified
 * - No backup created when the file does not exist (new file)
 * - No backup created when nothing changes (R4.3)
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { main } from "../plugins/jrobic-cc-harness-setup-example/scripts/harness-setup";
import { createTmpHome } from "./helpers/tmp-home";

const IMPORT_LINE = "@~/.claude/harness/CONTEXT.md";
const BEGIN = "<!-- BEGIN harness (managed — do not edit) -->";
const END = "<!-- END harness -->";

const ALL_DENY_RULES = [
  "Read(./.env)",
  "Read(./.env.*)",
  "Read(./**/.env)",
  "Read(./**/.env.*)",
  "Read(./secrets/**)",
  "Read(./**/secrets/**)",
  "Read(./**/*.pem)",
  "Read(./**/id_rsa)",
  "Read(~/.ssh/**)",
  "Read(~/.aws/**)",
  "Read(~/.kube/config)",
];

function backupsIn(dir: string, prefix: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.startsWith(`${prefix}.bak-`));
}

describe("backup — created on change (R6.1)", () => {
  it("creates a .bak-<timestamp> for settings.json when deny rules are added", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: [] } }),
      claudeMd: `${BEGIN}\n${IMPORT_LINE}\n${END}`,
    });

    const claudeDir = join(tmp.home, ".claude");
    expect(backupsIn(claudeDir, "settings.json")).toHaveLength(0);

    await main("apply", { HARNESS_HOME: tmp.home });

    expect(backupsIn(claudeDir, "settings.json").length).toBeGreaterThanOrEqual(1);
  });

  it("creates a .bak-<timestamp> for CLAUDE.md when import block is added", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: ALL_DENY_RULES } }),
      claudeMd: "# Existing content",
    });

    const claudeDir = join(tmp.home, ".claude");
    expect(backupsIn(claudeDir, "CLAUDE.md")).toHaveLength(0);

    await main("apply", { HARNESS_HOME: tmp.home });

    expect(backupsIn(claudeDir, "CLAUDE.md").length).toBeGreaterThanOrEqual(1);
  });

  it("bak file name contains an ISO-style timestamp", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: [] } }),
      claudeMd: `${BEGIN}\n${IMPORT_LINE}\n${END}`,
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const claudeDir = join(tmp.home, ".claude");
    const baks = backupsIn(claudeDir, "settings.json");
    expect(baks.length).toBeGreaterThanOrEqual(1);
    // .bak-2026-06-06T... — must contain digits and dashes
    expect(baks[0]).toMatch(/\.bak-\d{4}-\d{2}-\d{2}/);
  });
});

describe("backup — not created for new files (R6.2)", () => {
  it("creates no backup when settings.json does not previously exist", async () => {
    // No settings seeded → engine creates the file fresh, no backup
    const tmp = createTmpHome({ claudeMd: `${BEGIN}\n${IMPORT_LINE}\n${END}` });

    await main("apply", { HARNESS_HOME: tmp.home });

    const claudeDir = join(tmp.home, ".claude");
    expect(backupsIn(claudeDir, "settings.json")).toHaveLength(0);
  });

  it("creates no backup when CLAUDE.md does not previously exist", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: ALL_DENY_RULES } }),
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const claudeDir = join(tmp.home, ".claude");
    expect(backupsIn(claudeDir, "CLAUDE.md")).toHaveLength(0);
  });
});

describe("backup — not created when nothing changes (R4.3)", () => {
  it("creates no backup for settings.json when all deny rules already present", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: ALL_DENY_RULES } }),
      claudeMd: `${BEGIN}\n${IMPORT_LINE}\n${END}`,
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const claudeDir = join(tmp.home, ".claude");
    // settings.json was NOT modified (all rules already present) → no backup
    expect(backupsIn(claudeDir, "settings.json")).toHaveLength(0);
  });

  it("creates no backup for CLAUDE.md when import block already correct", async () => {
    const managedBlock = `${BEGIN}\n${IMPORT_LINE}\n${END}\n`;
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: ALL_DENY_RULES } }),
      claudeMd: managedBlock,
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const claudeDir = join(tmp.home, ".claude");
    expect(backupsIn(claudeDir, "CLAUDE.md")).toHaveLength(0);
  });
});
