import { afterEach, describe, expect, test } from "bun:test";
import { readFile, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Deny,
  type HookInput,
  logDeny,
  MAX_LOG_SIZE,
} from "../plugins/jrobic-cc-harness-setup-example/scripts/_shared/hook-lib.ts";

const TMP = tmpdir();
const prefix = `lib-test-${Date.now()}`;

function tmpLog(suffix: string): string {
  return join(TMP, `${prefix}-${suffix}.log`);
}

const STUB_INPUT: HookInput = {
  tool_name: "Read",
  session_id: "test-session",
};

const STUB_DENY: Deny = {
  ruleId: "test-rule",
  reason: "test reason",
  target: "/tmp/test",
};

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.map((f) => unlink(f).catch(() => {})));
  cleanup.length = 0;
});

describe("logDeny: basic writing", () => {
  test("creates a log file with JSONL entry", async () => {
    const log = tmpLog("basic");
    cleanup.push(log);

    await logDeny(log, "test-hook", STUB_INPUT, STUB_DENY);

    const content = await readFile(log, "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.rule_id).toBe("test-rule");
    expect(entry.session_id).toBe("test-session");
    expect(entry.tool_name).toBe("Read");
  });

  test("appends to existing log", async () => {
    const log = tmpLog("append");
    cleanup.push(log);

    await logDeny(log, "test-hook", STUB_INPUT, STUB_DENY);
    await logDeny(log, "test-hook", STUB_INPUT, {
      ...STUB_DENY,
      ruleId: "second",
    });

    const lines = (await readFile(log, "utf-8")).trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]!).rule_id).toBe("second");
  });
});

describe("logDeny: log rotation", () => {
  test("rotates log file when it exceeds MAX_LOG_SIZE", async () => {
    const log = tmpLog("rotate");
    const rotated = `${log}.1`;
    cleanup.push(log, rotated);

    const filler = "x".repeat(MAX_LOG_SIZE + 1);
    await writeFile(log, filler, { mode: 0o600 });

    await logDeny(log, "test-hook", STUB_INPUT, STUB_DENY);

    const rotatedContent = await readFile(rotated, "utf-8");
    expect(rotatedContent).toBe(filler);

    const newContent = await readFile(log, "utf-8");
    const entry = JSON.parse(newContent.trim());
    expect(entry.rule_id).toBe("test-rule");
  });

  test("does not rotate when under MAX_LOG_SIZE", async () => {
    const log = tmpLog("no-rotate");
    const rotated = `${log}.1`;
    cleanup.push(log);

    await writeFile(log, "small content\n", { mode: 0o600 });

    await logDeny(log, "test-hook", STUB_INPUT, STUB_DENY);

    const s = await stat(rotated).catch(() => null);
    expect(s).toBeNull();
  });

  test("overwrites previous .log.1 on rotation", async () => {
    const log = tmpLog("overwrite");
    const rotated = `${log}.1`;
    cleanup.push(log, rotated);

    await writeFile(rotated, "old-rotated-content", { mode: 0o600 });

    const filler = "y".repeat(MAX_LOG_SIZE + 1);
    await writeFile(log, filler, { mode: 0o600 });

    await logDeny(log, "test-hook", STUB_INPUT, STUB_DENY);

    const rotatedContent = await readFile(rotated, "utf-8");
    expect(rotatedContent).toBe(filler);
  });
});
