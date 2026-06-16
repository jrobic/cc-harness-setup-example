/**
 * harness-setup.check.test.ts — exit codes for the `check` subcommand.
 *
 * Covers R1.1–R1.5, R13.1:
 * - exit 0 when deny list is complete and import is present
 * - exit 3 when any deny rule is missing OR import is absent
 * - exit 2 when settings.json contains invalid JSON
 * - missing files treated as empty (not an error)
 *
 * Tests run against an isolated temp HOME via HARNESS_HOME (R7, R13.2).
 */

import { describe, expect, it, spyOn } from "bun:test";
import { writeFileSync } from "node:fs";
import { main } from "../plugins/jrobic-cc-harness-setup-example/scripts/harness-setup";
import { createTmpHome } from "./helpers/tmp-home";

const IMPORT_LINE = "@~/.claude/harness/CONTEXT.md";
const BEGIN = "<!-- BEGIN harness (managed — do not edit) -->";
const END = "<!-- END harness -->";
const MANAGED_BLOCK = `${BEGIN}\n${IMPORT_LINE}\n${END}`;

// All 11 rules from reference/deny.json
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

describe("check — exit codes", () => {
  it("exits 0 when deny list is complete and import is present (R1.2)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({
        permissions: { deny: ALL_DENY_RULES },
      }),
      claudeMd: MANAGED_BLOCK,
    });

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(0);
  });

  it("exits 3 when deny rules are missing (R1.3)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: [] } }),
      claudeMd: MANAGED_BLOCK,
    });

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(3);
  });

  it("exits 3 when import is absent even with complete deny (R1.3)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({
        permissions: { deny: ALL_DENY_RULES },
      }),
      claudeMd: "# My CLAUDE.md\n\nSome content.",
    });

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(3);
  });

  it("exits 3 when both deny and import are missing (R1.3)", async () => {
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({ permissions: { deny: [] } }),
      claudeMd: "# My CLAUDE.md",
    });

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(3);
  });

  it("exits 2 on invalid JSON in settings.json and writes nothing (R1.4)", async () => {
    const tmp = createTmpHome();
    writeFileSync(tmp.settingsPath, "{ not valid json }", "utf8");

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(2);
  });

  it("treats missing settings.json as empty deny list (R1.5)", async () => {
    // No settings.json seeded → treated as empty → missing rules → exit 3
    const tmp = createTmpHome({ claudeMd: MANAGED_BLOCK });

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(3);
  });

  it("treats missing CLAUDE.md as no import (R1.5)", async () => {
    // No CLAUDE.md seeded → import absent → exit 3
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({
        permissions: { deny: ALL_DENY_RULES },
      }),
    });

    const code = await main("check", { HARNESS_HOME: tmp.home });
    expect(code).toBe(3);
  });

  it("exits 2 on unknown mode (R2 contract)", async () => {
    const tmp = createTmpHome();
    const code = await main("bogus", { HARNESS_HOME: tmp.home });
    expect(code).toBe(2);
  });

  it("defaults mode to check when called with empty-string mode", async () => {
    // Per design: no arg defaults to check; with all rules + import → 0
    const tmp = createTmpHome({
      settingsJson: JSON.stringify({
        permissions: { deny: ALL_DENY_RULES },
      }),
      claudeMd: MANAGED_BLOCK,
    });

    const code = await main("", { HARNESS_HOME: tmp.home });
    expect(code).toBe(0);
  });

  it("reports the resolved home in the check output (isolation visibility)", async () => {
    const tmp = createTmpHome();
    const lines: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    try {
      await main("check", { HARNESS_HOME: tmp.home });
    } finally {
      spy.mockRestore();
    }
    expect(lines.join("\n")).toContain(`(home: ${tmp.home}/.claude)`);
  });
});
