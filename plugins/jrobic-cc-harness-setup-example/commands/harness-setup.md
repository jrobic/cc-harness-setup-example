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
  SCRIPT="$(find "$HOME/.claude/plugins" -name harness-setup.ts 2>/dev/null | head -1)"
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

## Step 3 — Present gaps and ask for confirmation

Show the user clearly:

- Which `deny` rules are missing from `~/.claude/settings.json → permissions.deny`
- Whether the context import line is absent from `~/.claude/CLAUDE.md`

Then ask: **"Apply these changes? (yes / no)"**

**Strict rule:** never invent a deny rule. The only source of truth is
`reference/deny.json` inside the plugin (the engine reads it directly).

## Step 4 — Apply (only after explicit confirmation)

If the user confirms:

```bash
bun run "$SCRIPT" apply
```

Then present the summary from the engine output. Make clear:

- Backup files (`.bak-<timestamp>`) were created for every modified file.
- Only the three target files were touched:
  `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/harness/CONTEXT.md`
- No other content was changed.

If the user declines or does not confirm, do not run `apply` and do not write anything.
