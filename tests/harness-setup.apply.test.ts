/**
 * harness-setup.apply.test.ts — apply subcommand behaviour.
 *
 * Covers R2.1–R2.5, R4.1–R4.3, R5.1–R5.3:
 * - deny concat + dedup
 * - pre-existing unrelated deny rules preserved
 * - context file copied to <home>/.claude/harness/CONTEXT.md
 * - single managed import block created in CLAUDE.md
 * - writes only the three target files
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
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

describe("apply — deny merge", () => {
  it("merges all reference deny rules into an empty deny list (R2.1)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: [] } }),
      claudeMd: "",
    });

    const code = await main("apply", { HARNESS_HOME: tmp.home });
    expect(code).toBe(0);

    const settings = JSON.parse(readFileSync(tmp.settingsPath, "utf8"));
    for (const rule of ALL_DENY_RULES) {
      expect(settings.permissions.deny).toContain(rule);
    }
  });

  it("de-duplicates rules when some are already present (R2.1, R3.1)", async () => {
    const alreadyPresent = ["Read(./.env)", "Read(~/.ssh/**)"];
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: alreadyPresent } }),
      claudeMd: "",
    });

    const code = await main("apply", { HARNESS_HOME: tmp.home });
    expect(code).toBe(0);

    const settings = JSON.parse(readFileSync(tmp.settingsPath, "utf8"));
    const deny: string[] = settings.permissions.deny;

    // Each rule appears exactly once
    for (const rule of alreadyPresent) {
      expect(deny.filter((r) => r === rule)).toHaveLength(1);
    }
  });

  it("preserves pre-existing deny rules not in the reference set (R4.2)", async () => {
    const customRule = "Read(./internal-secrets/**)";
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: [customRule] } }),
      claudeMd: "",
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const settings = JSON.parse(readFileSync(tmp.settingsPath, "utf8"));
    expect(settings.permissions.deny).toContain(customRule);
  });

  it("leaves other fields in settings.json unchanged (R2.1)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({
        model: "claude-opus-4-5",
        permissions: { deny: [] },
      }),
      claudeMd: "",
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const settings = JSON.parse(readFileSync(tmp.settingsPath, "utf8"));
    expect(settings.model).toBe("claude-opus-4-5");
  });

  it("does not write settings.json when no deny rule is missing (R4.3)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: ALL_DENY_RULES } }),
      claudeMd: `${BEGIN}\n${IMPORT_LINE}\n${END}`,
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    // No settings.json.bak-… file should be created when nothing changed.
    const { readdirSync } = await import("node:fs");
    const claudeDir = tmp.settingsPath.replace(/\/settings\.json$/, "");
    const files = readdirSync(claudeDir);
    const baks = files.filter((f) => f.startsWith("settings.json.bak-"));
    expect(baks).toHaveLength(0);
  });
});

describe("apply — context file", () => {
  it("copies reference CONTEXT.md to <home>/.claude/harness/CONTEXT.md (R2.2, R5.3)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });

    await main("apply", { HARNESS_HOME: tmp.home });

    expect(existsSync(tmp.contextDestPath)).toBe(true);
    const content = readFileSync(tmp.contextDestPath, "utf8");
    // Should contain the deny ≠ context note from our reference file
    expect(content).toContain("deny");
  });

  it("creates parent harness/ directory if it does not exist (R2.2)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });
    // No harness/ dir seeded — engine must create it

    await main("apply", { HARNESS_HOME: tmp.home });
    expect(existsSync(tmp.contextDestPath)).toBe(true);
  });
});

describe("apply — import block", () => {
  it("creates a managed import block in an empty CLAUDE.md (R2.3, R5.1)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });

    await main("apply", { HARNESS_HOME: tmp.home });

    const content = readFileSync(tmp.claudeMdPath, "utf8");
    expect(content).toContain(BEGIN);
    expect(content).toContain(IMPORT_LINE);
    expect(content).toContain(END);
  });

  it("creates the import block in a non-empty CLAUDE.md without altering prior content (R5.2)", async () => {
    const existing = "# My Config\n\nSome personal settings here.";
    const tmp = createTmpHome({ claudeMd: existing });

    await main("apply", { HARNESS_HOME: tmp.home });

    const content = readFileSync(tmp.claudeMdPath, "utf8");
    expect(content).toContain(existing.trim());
    expect(content).toContain(BEGIN);
    expect(content).toContain(IMPORT_LINE);
    expect(content).toContain(END);
    // Prior content appears before the managed block
    expect(content.indexOf(existing.trim())).toBeLessThan(content.indexOf(BEGIN));
  });

  it("exits 0 (R2.4)", async () => {
    const tmp = createTmpHome();
    const code = await main("apply", { HARNESS_HOME: tmp.home });
    expect(code).toBe(0);
  });
});
