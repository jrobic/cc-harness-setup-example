/**
 * harness-setup.idempotence.test.ts — second apply is a no-op.
 *
 * Covers R3.1–R3.4:
 * - No duplicate deny rules after a second apply
 * - Exactly one managed import block after a second apply
 * - Import line outside markers is not duplicated
 * - check exits 0 immediately after apply
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
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

describe("idempotence — second apply", () => {
  it("leaves no duplicate deny rules after two applies (R3.1)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });

    await main("apply", { HARNESS_HOME: tmp.home });
    await main("apply", { HARNESS_HOME: tmp.home });

    const settings = JSON.parse(readFileSync(tmp.settingsPath, "utf8"));
    const deny: string[] = settings.permissions.deny;

    for (const rule of ALL_DENY_RULES) {
      const count = deny.filter((r) => r === rule).length;
      expect(count).toBe(1);
    }
  });

  it("keeps exactly one managed import block after two applies (R3.2)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });

    await main("apply", { HARNESS_HOME: tmp.home });
    await main("apply", { HARNESS_HOME: tmp.home });

    const content = readFileSync(tmp.claudeMdPath, "utf8");

    const beginCount =
      (content.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    const endCount =
      (content.match(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    const importCount =
      (content.match(new RegExp(IMPORT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
        .length;

    expect(beginCount).toBe(1);
    expect(endCount).toBe(1);
    expect(importCount).toBe(1);
  });

  it("does not add a second import when import line exists outside markers (R3.3)", async () => {
    // Seed CLAUDE.md with the import line already present (but no managed block)
    const tmp = createTmpHome({
      claudeMd: `# My Config\n\n${IMPORT_LINE}\n`,
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const content = readFileSync(tmp.claudeMdPath, "utf8");
    const importCount =
      (content.match(new RegExp(IMPORT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
        .length;

    expect(importCount).toBe(1);
  });

  it("check exits 0 immediately after apply (R3.4)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });

    const applyCode = await main("apply", { HARNESS_HOME: tmp.home });
    expect(applyCode).toBe(0);

    const checkCode = await main("check", { HARNESS_HOME: tmp.home });
    expect(checkCode).toBe(0);
  });

  it("check exits 0 after two consecutive applies (R3.4)", async () => {
    const tmp = createTmpHome({ claudeMd: "" });

    await main("apply", { HARNESS_HOME: tmp.home });
    await main("apply", { HARNESS_HOME: tmp.home });

    const checkCode = await main("check", { HARNESS_HOME: tmp.home });
    expect(checkCode).toBe(0);
  });

  it("import outside markers is not wrapped in a second managed block (R3.3)", async () => {
    const tmp = createTmpHome({
      claudeMd: `# Header\n\n${IMPORT_LINE}\n\nSome more content.`,
    });

    await main("apply", { HARNESS_HOME: tmp.home });

    const content = readFileSync(tmp.claudeMdPath, "utf8");
    // There should be no managed block markers added
    expect(content).not.toContain(BEGIN);
    expect(content).not.toContain(END);
    // Original import line is still there exactly once
    const importCount =
      (content.match(new RegExp(IMPORT_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
        .length;
    expect(importCount).toBe(1);
  });
});
