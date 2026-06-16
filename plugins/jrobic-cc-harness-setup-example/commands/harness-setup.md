---
description: Configure and audit the Claude Code harness (deny list + team context import in CLAUDE.md). Presents missing items and requests confirmation before any write.
allowed-tools: Bash(bun:*), Bash(find:*), Bash(test:*), Read
---

You are configuring / auditing the user's Claude Code harness. **Do not write anything until the user has explicitly confirmed.**

## Step 1 — Locate the engine

`${CLAUDE_PLUGIN_ROOT}` does not expand reliably inside command markdown. Use the
variable when available, then fall back to a filesystem search under the installed
plugins directory:

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/scripts/harness-setup.ts}"
if [ -z "$SCRIPT" ] || [ ! -f "$SCRIPT" ]; then
  # Resolve the plugins directory from CLAUDE_CONFIG_DIR when set (isolated/demo
  # homes), falling back to ~/.claude for a normal install.
  SCRIPT="$(find "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins" -name harness-setup.ts 2>/dev/null | head -1)"
fi
if [ -z "$SCRIPT" ] || [ ! -f "$SCRIPT" ]; then
  echo "ERROR: harness-setup.ts engine not found. Is the plugin installed?" >&2
  exit 1
fi
echo "Engine: $SCRIPT"
```

## Step 2 — Audit (check only, no writes)

```bash
bun run "$SCRIPT" check
```

- Exit code `0` → configuration is complete. Inform the user and stop here.
- Exit code `3` → configuration is incomplete. Continue to Step 3.
- Exit code `2` → usage or JSON error. Report the error output and stop.

The engine prints the **resolved home** it operates on, e.g.
`Harness — configuration status (home: /Users/you/.claude)`. **Surface that exact
path to the user** so they can confirm which config is being audited (this matters
for isolated/demo homes).

## Step 3 — Present gaps and ask for confirmation

Show the user clearly, using the **home path the engine reported** (do not assume
`~/.claude` — it may be an isolated home):

- Which `deny` rules are missing from `<home>/settings.json → permissions.deny`
- Whether the context import line is absent from `<home>/CLAUDE.md`

Then **confirm with a structured prompt**: call the **`AskUserQuestion`** tool with
a single question ("Apply these harness changes?") and two options —
**Apply** (merge the deny rules and write the context import) and **Cancel**
(do nothing). Do not accept free-text yes/no. Proceed to Step 4 **only** if the
user selects **Apply**. If `AskUserQuestion` is unavailable (e.g. a headless /
print-mode run), fall back to an explicit typed confirmation.

**Strict rule:** never invent a deny rule. The only source of truth is
`reference/deny.json` inside the plugin (the engine reads it directly).

## Step 4 — Apply (only after explicit confirmation)

If the user selected **Apply**:

```bash
bun run "$SCRIPT" apply
```

Then present the summary from the engine output. Make clear (use the resolved
`<home>` the engine reported, not a hardcoded `~/.claude`):

- Backup files (`.bak-<timestamp>`) were created for every modified file.
- Only the three target files were touched:
  `<home>/settings.json`, `<home>/CLAUDE.md`, `<home>/harness/CONTEXT.md`
- No other content was changed.

If the user declines or does not confirm, do not run `apply` and do not write anything.
