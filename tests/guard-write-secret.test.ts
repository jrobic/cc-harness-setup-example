/**
 * guard-write-secret.test.ts — PreToolUse(Write/Edit/MultiEdit) secret-in-content
 * guard. Covers scanSecrets() detection of high-signal token shapes, low false
 * positives on placeholders, and the spawned stdin/stdout wiring.
 */

import { describe, expect, it } from "bun:test";
import {
  inspect,
  scanSecrets,
} from "../plugins/jrobic-cc-harness-setup-example/scripts/guard-write-secret";

const SCRIPT = "plugins/jrobic-cc-harness-setup-example/scripts/guard-write-secret.ts";

// Synthetic secret SHAPES, assembled at runtime by concatenation so NO contiguous
// secret literal is committed — this avoids tripping gitleaks AND GitHub's
// server-side push protection, while still exercising the regexes. Not live.
const AWS_KEY = "AKIA" + "IOSFODNN7EXAMPLE";
const GH_PAT = "ghp_" + "x".repeat(36);
const SLACK = "xoxb-" + "1234567890-abcdefghijklmnop";
const GOOGLE = "AIza" + "x".repeat(35);
const STRIPE = "sk_live_" + "x".repeat(24);
const JWT = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiJ0ZXN0In0", "x".repeat(43)].join(".");
const PRIVKEY = "-----BEGIN RSA "
  + "PRIVATE KEY-----\nplaceholder-not-a-real-key\n-----END KEY-----";

async function runGuard(stdin: string): Promise<{ stdout: string; code: number; }> {
  const proc = Bun.spawn(["bun", "run", SCRIPT], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const code = await proc.exited;
  return { stdout: stdout.trim(), code };
}

describe("scanSecrets — detects high-signal token shapes", () => {
  const secrets: Array<[string, string]> = [
    ["AWS access key id", `const k = "${AWS_KEY}"`],
    ["GitHub PAT", `token: ${GH_PAT}`],
    ["Slack token", `SLACK=${SLACK}`],
    ["Google API key", `key=${GOOGLE}`],
    ["Stripe live key", `stripe=${STRIPE}`],
    ["JWT", `auth=${JWT}`],
    ["private key block", PRIVKEY],
  ];
  for (const [label, text] of secrets) {
    it(`flags: ${label}`, () => {
      expect(scanSecrets(text, "f.ts")).not.toBeNull();
    });
  }
});

describe("scanSecrets — low false positives", () => {
  const clean = [
    "const total = price * tax;",
    "export function getUser() { return db.users.find(); }",
    "API_KEY=\"your-api-key-here\"",
    "password = \"<changeme>\"",
    "// TODO: wire up the secret manager",
    "",
  ];
  for (const text of clean) {
    it(`allows: ${text.slice(0, 32) || "(empty)"}`, () => {
      expect(scanSecrets(text, "f.ts")).toBeNull();
    });
  }
});

describe("inspect — per-tool content extraction", () => {
  it("flags a Write whose content carries a secret", () => {
    const d = inspect({
      tool_name: "Write",
      tool_input: { file_path: "a.ts", content: `x=${AWS_KEY}` },
    });
    expect(d?.ruleId).toBe("aws-access-key-id");
  });

  it("flags an Edit whose new_string carries a secret", () => {
    const d = inspect({
      tool_name: "Edit",
      tool_input: { file_path: "a.ts", new_string: `t=${GH_PAT}` },
    });
    expect(d).not.toBeNull();
  });

  it("flags a MultiEdit whose edits carry a secret", () => {
    const d = inspect({
      tool_name: "MultiEdit",
      tool_input: { file_path: "a.ts", edits: [{ new_string: "ok" }, { new_string: PRIVKEY }] },
    });
    expect(d?.ruleId).toBe("private-key");
  });

  it("ignores unrelated tools", () => {
    expect(inspect({ tool_name: "Read", tool_input: { file_path: "a.ts" } })).toBeNull();
  });
});

describe("guard-write-secret hook — stdin/stdout wiring (spawned)", () => {
  it("denies a Write carrying a secret, exit 0", async () => {
    const { stdout, code } = await runGuard(
      JSON.stringify({
        tool_name: "Write",
        tool_input: { file_path: "a.ts", content: `x=${AWS_KEY}` },
      }),
    );
    expect(code).toBe(0);
    expect(JSON.parse(stdout).hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("stays silent for a clean Write, exit 0", async () => {
    const { stdout, code } = await runGuard(
      JSON.stringify({
        tool_name: "Write",
        tool_input: { file_path: "a.ts", content: "const x = 1;" },
      }),
    );
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });

  it("fails open on a malformed envelope", async () => {
    const { stdout, code } = await runGuard("nope");
    expect(code).toBe(0);
    expect(stdout).toBe("");
  });
});
