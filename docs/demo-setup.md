# Demo setup — runbook

🇫🇷 Version française : [`demo-setup.fr.md`](demo-setup.fr.md).

A runbook for presenting the harness live from a **fresh, isolated Claude Code
state**, without touching your real `~/.claude` config. Built to rehearse, reset,
and start over cleanly (Mac mini or MacBook).

> **What the demo says.** The harness is the **team's minimum** — a baseline deny
> list, the shared context, the tooling — installed in one command. The developer
> or DevOps starts from there and **then adds their own plugins, skills and MCP
> servers** to taste. It is not a security product: it's **setup facilitation**,
> with a few guardrails as a bonus. The end goal of the guardrails is **hooks**
> that detect secret leaks and block denied commands — out of scope for this
> phase.

---

## 1. The isolation model (understand this first)

Two environment variables, which must **point at the same directory**, otherwise
the demo writes into your real config:

| Variable            | Who reads it           | Role                                                          |
| ------------------- | ---------------------- | ------------------------------------------------------------- |
| `CLAUDE_CONFIG_DIR` | **Claude Code**        | Where the CLI reads/writes its config (settings, plugins, …). |
| `HARNESS_HOME`      | **the harness engine** | Its base; it writes into `$HARNESS_HOME/.claude/…`.           |

The engine resolves its path via `HARNESS_HOME ?? os.homedir()` and does **not**
use `CLAUDE_CONFIG_DIR` (see `plugins/.../scripts/harness-setup.ts`). So:

- `CLAUDE_CONFIG_DIR` alone → Claude is isolated, **but** `/harness-setup` would
  write into the real `~/.claude`. ❌
- Both aligned on `~/claude-demo/.claude` → what the engine writes = what Claude
  reads. ✅

```text
~/claude-demo/.claude/        ← CLAUDE_CONFIG_DIR points here
  settings.json               ← deny list merged by the engine
  CLAUDE.md                   ← context import block
  harness/CONTEXT.md          ← embedded team context
  plugins/                    ← the plugin installed during the demo
HARNESS_HOME = ~/claude-demo  ← the engine writes into $HARNESS_HOME/.claude/…
```

> On a machine where `~/.claude` is a **symlink** to versioned dotfiles, never run
> `mv ~/.claude` — you'd break the link. Env-based isolation never touches it, so
> there is nothing to back up. (Check the type with `ls -ld ~/.claude`: a leading
> `l` means symlink, `d` means a real directory.)

---

## 2. The alias

Add this to your `~/.zshrc` (the demo directory is created on the fly):

```bash
# Launch Claude Code in a fresh, isolated state for demos
alias claude-demo='CLAUDE_CONFIG_DIR="$HOME/claude-demo/.claude" \
  HARNESS_HOME="$HOME/claude-demo" \
  sh -c '\''mkdir -p "$CLAUDE_CONFIG_DIR" && claude'\'''
```

Then `source ~/.zshrc`. Launch the demo with `claude-demo`.

Reset-included variant (always starts from zero):

```bash
alias claude-demo-fresh='rm -rf "$HOME/claude-demo" && claude-demo'
```

---

## 3. Live walk-through (4 steps = the 4 infographic panels)

Once `claude-demo` is launched, inside the session:

```text
# 1. (fresh machine — Claude already installed: brew install node ; npm i -g @anthropic-ai/claude-code)
# 2. trust the folder → onboarding

# 3. Add the team plugin
claude plugin marketplace add jrobic/cc-harness-setup-example
claude plugin install jrobic-cc-harness-setup-example

# 4. Apply the minimal harness
/harness-setup
#   → check (exit 3) → presents missing deny rules + absent import
#   → confirm (AskUserQuestion: Apply / Cancel) → apply → re-check (exit 0)

# 5. (optional) show the tooling layer
/mcp        # the `example` MCP server is connected, with its tools
```

Closing message: **the developer starts from this minimum and then adds their own
plugins / skills / MCP servers.**

> **Pre-warm the MCP before presenting** so the first `/mcp` isn't an npm
> download: `npx -y @modelcontextprotocol/server-everything` (Ctrl-C once it
> starts). The `datadog` server stays hidden until `DATADOG_MCP_URL` is set —
> that's expected (see [`how-it-works.md` §5](how-it-works.md#5-tooling-mcp-servers-and-clis)).

---

## 4. Verify the isolation (before presenting)

```bash
# the demo directory must hold the written config
ls -la "$HOME/claude-demo/.claude"   # settings.json, CLAUDE.md, harness/

# your real config must NOT have moved
ls -la "$HOME/.claude/settings.json" # mtime unchanged (follow the symlink target)
```

If `settings.json` shows up under your real config after an apply: the two
variables were not aligned — check the alias.

---

## 5. Reset between rehearsals

```bash
rm -rf "$HOME/claude-demo"   # then relaunch claude-demo (or use claude-demo-fresh directly)
```

No teardown: the entire demo state lives in `~/claude-demo`, never anywhere else.

---

## 6. Authentication

On macOS, Claude Code credentials live in the **Keychain**, not in the config
directory. As a result:

- With a fresh `CLAUDE_CONFIG_DIR`, **you stay logged in** — no re-login on
  stage. 👍
- To _show_ the login step anyway: `/login` in-session, or remove the Keychain
  entry before launching:

  ```bash
  security delete-generic-password -l "Claude Code" 2>/dev/null || true
  ```

  (The exact label may vary; list them with
  `security dump-keychain | grep -i claude`.)

---

## 7. Fresh machine (real `~/.claude`)

If you demo on a machine where `~/.claude` is a **real directory** (not a
symlink): you still don't need to move it — `claude-demo` bypasses it via
`CLAUDE_CONFIG_DIR`. Just check the type first:

```bash
ls -ld "$HOME/.claude"   # leading 'l' = symlink ; 'd' = real directory
```

Either way, the alias isolates the demo without backing anything up.

---

## See also

- [`demo-setup.fr.md`](demo-setup.fr.md) — French version
- [`how-it-works.md`](how-it-works.md) — architecture (FR: [`how-it-works.fr.md`](how-it-works.fr.md))
- [`infographic-brief.md`](infographic-brief.md) — onboarding infographic brief
- [`../PRESENTATION.md`](../PRESENTATION.md) — presentation talk track
