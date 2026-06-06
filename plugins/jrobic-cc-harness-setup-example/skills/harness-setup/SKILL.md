---
name: harness-setup
description: >
  Set up, configure, verify, or audit the Claude Code harness (deny list +
  team context import in CLAUDE.md). Trigger on intents such as: "set up my
  harness", "configure Claude Code", "verify my deny list", "audit my harness",
  "apply the team context", "check my Claude Code setup".
---

# Harness setup skill

When the user wants to set up, configure, verify, or audit their Claude Code
harness — including the deny list and the team context import — execute the
following flow. **Never write anything without explicit user confirmation.**

## Flow

### 1. Locate the engine

`${CLAUDE_PLUGIN_ROOT}` may not expand in this context. Use a filesystem fallback:

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/scripts/harness-setup.ts}"
if [ -z "$SCRIPT" ] || [ ! -f "$SCRIPT" ]; then
  SCRIPT="$(find "$HOME/.claude/plugins" -name harness-setup.ts 2>/dev/null | head -1)"
fi
if [ -z "$SCRIPT" ] || [ ! -f "$SCRIPT" ]; then
  echo "ERROR: harness-setup.ts engine not found. Is the plugin installed?" >&2
  exit 1
fi
```

### 2. Run check

```bash
bun run "$SCRIPT" check
```

- Exit `0` → already complete. Report this and stop.
- Exit `3` → incomplete. Proceed to step 3.
- Exit `2` → error. Report and stop.

### 3. Present gaps and request confirmation

Show the user:

- Missing `deny` rules (from `~/.claude/settings.json`)
- Whether the context import line is absent from `~/.claude/CLAUDE.md`

Ask for explicit confirmation before any write.

**Never invent deny rules.** The source of truth is `reference/deny.json`
inside the plugin. The engine reads it directly — do not duplicate or
modify the rule list manually.

### 4. Apply after confirmation

```bash
bun run "$SCRIPT" apply
```

After apply, present the summary. Confirm that:

- `.bak-<timestamp>` backups were created for every modified file.
- Only the three target files were touched:
  `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/harness/CONTEXT.md`
- Nothing else was changed.

If the user declines, do not run `apply` and do not write anything.
