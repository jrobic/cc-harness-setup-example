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
  # CLAUDE_CONFIG_DIR covers isolated/demo homes; fall back to ~/.claude.
  SCRIPT="$(find "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins" -name harness-setup.ts 2>/dev/null | head -1)"
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

The engine prints the **resolved home** it audits, e.g.
`Harness — configuration status (home: /Users/you/.claude)`. Surface that path so
the user knows which config is being touched (it may be an isolated/demo home).

### 3. Present gaps and request confirmation

Show the user (using the home path the engine reported, not a hardcoded
`~/.claude`):

- Missing `deny` rules (from `<home>/settings.json`)
- Whether the context import line is absent from `<home>/CLAUDE.md`

**Confirm with a structured prompt:** call the **`AskUserQuestion`** tool with one
question ("Apply these harness changes?") and two options — **Apply** and
**Cancel** — rather than free-text. Apply only if the user selects **Apply**. Fall
back to an explicit typed confirmation if `AskUserQuestion` is unavailable
(headless/print mode).

**Never invent deny rules.** The source of truth is `reference/deny.json`
inside the plugin. The engine reads it directly — do not duplicate or
modify the rule list manually.

### 4. Apply after confirmation

Only if the user selected **Apply**:

```bash
bun run "$SCRIPT" apply
```

After apply, present the summary. Confirm that:

- `.bak-<timestamp>` backups were created for every modified file.
- Only the three target files were touched (under the resolved `<home>`):
  `<home>/settings.json`, `<home>/CLAUDE.md`, `<home>/harness/CONTEXT.md`
- Nothing else was changed.

If the user declines, do not run `apply` and do not write anything.
