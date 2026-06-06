/**
 * harness-setup.hardened-parity.test.ts — proves R10.3 / ADR-0003.
 *
 * The compiled binary (`bun build --compile`) MUST behave identically to soft
 * mode. The historical bug was that reference files (deny.json, CONTEXT.md) were
 * read from the filesystem, which does not exist inside the compiled binary —
 * making the deny audit silently report "up to date" for any machine. Reference
 * data is now embedded via imports; this test is the regression guard.
 *
 * It builds the real binary and drives it as a subprocess against an isolated
 * HARNESS_HOME, asserting the same exit codes and on-disk writes as soft mode.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTmpHome } from "./helpers/tmp-home";

const ENGINE = join(
  import.meta.dir,
  "..",
  "plugins",
  "jrobic-cc-harness-setup-example",
  "scripts",
  "harness-setup.ts",
);

let buildDir: string;
let binPath: string;

/** Runs the compiled binary in a given mode against an isolated home. */
function runBinary(mode: string, home: string): { code: number; stdout: string; } {
  const proc = Bun.spawnSync([binPath, mode], {
    env: { ...process.env, HARNESS_HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: proc.exitCode, stdout: proc.stdout.toString() };
}

beforeAll(() => {
  buildDir = mkdtempSync(join(tmpdir(), "harness-bin-"));
  binPath = join(buildDir, "harness-setup");
  const build = Bun.spawnSync(
    ["bun", "build", "--compile", "--outfile", binPath, ENGINE],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (build.exitCode !== 0) {
    throw new Error(
      `bun build --compile failed (exit ${build.exitCode}):\n${build.stderr.toString()}`,
    );
  }
});

afterAll(() => {
  rmSync(buildDir, { recursive: true, force: true });
});

describe("hardened binary — parity with soft mode (R10.3)", () => {
  it("check on an empty home reports incomplete (exit 3), NOT a false 'up to date'", () => {
    const tmp = createTmpHome({});
    const { code, stdout } = runBinary("check", tmp.home);
    expect(code).toBe(3);
    expect(stdout).toContain("missing rule(s)");
    expect(stdout).not.toContain("deny list: up to date");
  });

  it("apply writes the embedded deny rules and context (no sidecar ENOENT)", () => {
    const tmp = createTmpHome({});
    const apply = runBinary("apply", tmp.home);
    expect(apply.code).toBe(0);

    // settings.json got the full embedded deny set
    const settings = JSON.parse(readFileSync(tmp.settingsPath, "utf8"));
    expect(settings.permissions.deny).toHaveLength(11);
    expect(settings.permissions.deny).toContain("Read(~/.ssh/**)");

    // context file written from the embedded text (not copied from a sidecar)
    expect(existsSync(tmp.contextDestPath)).toBe(true);
    expect(readFileSync(tmp.contextDestPath, "utf8")).toContain("deny");

    // CLAUDE.md import block present
    expect(readFileSync(tmp.claudeMdPath, "utf8")).toContain("@~/.claude/harness/CONTEXT.md");
  });

  it("check after apply reports complete (exit 0) — same as soft", () => {
    const tmp = createTmpHome({});
    expect(runBinary("apply", tmp.home).code).toBe(0);
    expect(runBinary("check", tmp.home).code).toBe(0);
  });
});
