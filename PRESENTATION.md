# Talk Track — cc-harness-setup-example

A reproducible demo script for the community session. Total duration: ~20 min.
Adapt the timing to your audience.

---

## Intro (2 min)

**Problem statement:**

> Every team working with Claude Code hits the same bootstrap problem: how do you
> ensure every developer's agent is set up with the right guard-rails and context,
> without it being a manual, drift-prone process?

This repo is a minimal, public, honest answer to that question.

---

## Slide 1 — The three layers (5 min)

Draw or show the diagram. Key point: **these three things are not the same**.

```
┌─────────────────────────────────────────────────────┐
│  Enforcement  (hard)                                │
│  permissions.deny in settings.json                  │
│  → the agent cannot read secrets, no matter what    │
├─────────────────────────────────────────────────────┤
│  Tooling      (pluginnable)                         │
│  commands / skills / hooks / MCP servers            │
│  → shipped as a marketplace plugin                  │
├─────────────────────────────────────────────────────┤
│  Context      (advisory)                            │
│  @~/.claude/harness/CONTEXT.md imported in CLAUDE.md│
│  → guidance; the agent reads it but can be argued   │
│    out of it by subsequent instructions              │
└─────────────────────────────────────────────────────┘
```

**Critical invariant: deny ≠ context.**

- `CLAUDE.md` is guidance. It can be overridden.
- `permissions.deny` is enforcement. The agent cannot bypass it by being asked
  nicely.
- Never put a hard prohibition in `CLAUDE.md`. It belongs in the deny list.

---

## Slide 2 — Scope merge (native, free) (3 min)

Claude Code merges configuration across scopes:

```
Managed > CLI > Local > Project > User
```

Array-valued fields (deny/allow lists) are **concatenated and de-duplicated**
across scopes — not overwritten. This means:

- The engine does `concat + dedup`: it adds missing rules without touching
  existing ones.
- The developer's existing deny rules are always preserved.
- Running `apply` twice is safe — no duplicate rules.

Demonstrate by showing the idempotence test:

```bash
bun test tests/harness-setup.idempotence.test.ts
```

---

## Slide 3 — The `${CLAUDE_PLUGIN_ROOT}` trap (2 min)

A common pitfall when writing Claude Code plugins:

| Surface          | `${CLAUDE_PLUGIN_ROOT}` expands? | Strategy                                                             |
| ---------------- | -------------------------------- | -------------------------------------------------------------------- |
| `hooks.json`     | **Yes**                          | Use it directly                                                      |
| Command markdown | **No**                           | Filesystem fallback: `find ~/.claude/plugins -name harness-setup.ts` |

The hooks file uses the variable directly — that's reliable.
The command and skill use a shell fallback — that's safe.

Show the relevant section of `commands/harness-setup.md`.

---

## Slide 4 — Clone & go (1 min)

Show `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": [
    { "label": "harness-setup-example", "githubRepo": "jrobic/cc-harness-setup-example" }
  ]
}
```

Trust the folder → Claude Code detects the marketplace → prompts to install.
One `git clone`, no manual `claude plugin marketplace add`.

The repo's own `.claude/settings.json` shows this minimal `extraKnownMarketplaces` skeleton.

---

## Slide 5 — Soft vs hardened: the honest answer (3 min)

| Mode           | Engine invocation                      | In git?                         |
| -------------- | -------------------------------------- | ------------------------------- |
| Soft (default) | `bun run harness-setup.ts`             | Yes — readable, editable source |
| Hardened       | `dist/harness-setup` (compiled binary) | No — built on demand            |

Build the binary live:

```bash
bun run build:hardened
ls -lh dist/harness-setup
```

**The caveat you must say out loud:**

> The binary is **not enforcement**. A determined developer can replace it.
> Real enforcement is `permissions.deny`, and only the **managed scope** is
> truly non-bypassable. We call this mode "hardened" because it hardens the
> tooling against _accidental_ edits — not against adversarial ones.

---

## Demo — reproducible steps (5 min)

### Setup (do once before the talk)

```bash
git clone https://github.com/jrobic/cc-harness-setup-example
cd cc-harness-setup-example
bun install
bun test   # should show 32 pass, 0 fail
```

### Live demo sequence

**Step 1 — show the engine running directly:**

```bash
HARNESS_HOME=/tmp/harness-demo \
  bun run plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts check
# → exit 3: incomplete (fresh HOME)

HARNESS_HOME=/tmp/harness-demo \
  bun run plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts apply
# → exit 0: applied, backups created

HARNESS_HOME=/tmp/harness-demo \
  bun run plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts check
# → exit 0: complete
```

**Step 2 — run the tests:**

```bash
bun test
```

---

## Q&A prompts

- "Why not just ship a managed settings file?" → Only the managed scope is
  non-bypassable; the plugin format can't write to it. The engine bridges that
  gap with consent.
- "Can the developer undo this?" → Yes. `.bak-<timestamp>` backups are created.
  The deny rules are append-only (the engine never removes existing rules).
- "What's Phase 2?" → Real business hooks/skills/agents/MCP, managed/MDM
  promotion for the enforcement layer. Phase 1 is the skeleton — the mechanism,
  not the policy.
