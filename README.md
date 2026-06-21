# cc-harness-setup-example

Onboard a developer onto a recommended Claude Code configuration in one command.

This repository is a minimal, generic, production-ready example of a **Claude Code
harness**: a deny list, a team context import, and the tooling to install and
maintain them — all shipped as a Claude Code marketplace plugin.

---

## What this is

A harness covers **three distinct layers**. They are kept separate because they
have different trust properties:

| Layer           | What                                                       | Trust                                     |
| --------------- | ---------------------------------------------------------- | ----------------------------------------- |
| **Enforcement** | `permissions.deny` rules in `settings.json`                | Hard — the agent cannot read around these |
| **Tooling**     | Commands, skills, hooks, MCP servers (shipped as a plugin) | Portable, pluginnable                     |
| **Context**     | `CLAUDE.md` import — advisory guidance for the agent       | Soft — can be overridden                  |

> **Key invariant: deny ≠ context.** A hard prohibition belongs in the deny list,
> never in `CLAUDE.md`. The deny list is the enforcement layer; `CLAUDE.md` is
> guidance the agent can be talked out of.

The engine (`harness-setup.ts`) performs the two writes that the plugin format
cannot express by itself — the deny merge and the context import — with your
explicit confirmation, and backs up every file it touches.

---

## Install

### Public GitHub marketplace (recommended)

Register this repo as a marketplace, then install the plugin:

```bash
claude plugin marketplace add jrobic/cc-harness-setup-example
claude plugin install jrobic-cc-harness-setup-example
```

### Clone & go

This repository ships a `.claude/settings.json` that declares itself as a known
marketplace. Trust the folder and Claude Code will prompt you to register and
install automatically.

```bash
git clone https://github.com/jrobic/cc-harness-setup-example
cd cc-harness-setup-example
claude  # trust the folder → follow the marketplace prompt
```

### Private git host (generic HTTPS)

For a privately hosted fork, use the full HTTPS URL. Your existing git credential
helper (e.g. the macOS keychain, a token stored via `git credential`, or SSH
key forwarding) handles authentication — no special setup needed:

```bash
claude plugin marketplace add https://git.example.com/your-org/cc-harness-setup-example.git
claude plugin install jrobic-cc-harness-setup-example
```

If your private server requires a token, configure it once via git's credential
helper rather than embedding it in the URL:

```bash
git config --global credential.helper store   # or 'osxkeychain', 'manager', etc.
```

---

## Run the harness setup

Once the plugin is installed, run:

```
/harness-setup
```

The command will:

1. Run `check` — audit your `~/.claude/settings.json` and `~/.claude/CLAUDE.md`.
2. Present any missing deny rules and the absent context import (if any).
3. Ask for your explicit confirmation before writing anything.
4. Run `apply` — merge the deny rules, copy the context file, and ensure exactly
   one managed import block in `CLAUDE.md`.
5. Report what changed and confirm that `.bak-<timestamp>` backups were created.

Nothing is written without your agreement. Every modified file gets a backup.

---

## Tooling layer: MCP servers + CLIs

The plugin's [`.mcp.json`](plugins/jrobic-cc-harness-setup-example/.mcp.json)
declares two MCP servers, and the tooling layer mixes mechanisms by what fits the
target:

- **`example` → a live MCP, no credentials.** The official MCP reference server
  (`@modelcontextprotocol/server-everything`), stdio over `npx`, no auth. It
  connects out of the box, so `/mcp` visibly shows a working MCP with example
  tools — a placeholder to demonstrate the layer; swap it for your real servers.
- **`datadog` → a realistic example (needs setup).** The official Datadog MCP
  server (HTTP, **OAuth at runtime** — no key committed). The endpoint is
  org/site-specific, left as `${DATADOG_MCP_URL}`; **unset, it silently fails and
  does _not_ appear in `/mcp`** (expected — it's a needs-setup placeholder).
  Easiest path: `/plugin install datadog@claude-plugins-official` then `/ddsetup`.
- **GitLab & AWS → CLI + skill (planned).** `glab` and the `aws` CLI already
  cover the ground, so these will be wrapped as **skills over the CLI** rather
  than MCP servers (not built in this phase).

See [`docs/how-it-works.md` §5](docs/how-it-works.md#5-tooling-mcp-servers-and-clis)
for the rationale (when to use an MCP server vs a CLI-backed skill) and setup
details.

---

## Guardrail hooks

Beyond the static deny list, the plugin ships four **guardrail hooks** that run
automatically (while the plugin is enabled) and intervene **before** a risky tool
call:

| Guard                | Behaviour           | Protects against                                                                                                                                                            |
| -------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guard-command`      | **block** / **ask** | destructive commands (`rm -rf /`, disk wipes, fork bombs), exfiltration (`curl … \| bash`, uploads), escalation (`sudo`, setuid); **asks** before history-rewriting git ops |
| `guard-secret`       | **block**           | reading secret files (`.env`, SSH/PGP keys, `~/.aws/credentials`, Terraform state, …), symlinks resolved                                                                    |
| `guard-write-secret` | **block**           | writing a hardcoded secret value (AWS key, GitHub PAT, private key, …) into a file                                                                                          |
| `guard-prompt`       | **warn**            | prompt-injection signatures in submitted/pasted text                                                                                                                        |

**Defense in depth, not a sandbox** — string-matching hooks are bypassable by
shell obfuscation and don't cover MCP tools. See
[`docs/guardrails.md`](docs/guardrails.md) (🇫🇷 [FR](docs/guardrails.fr.md)) for
behaviour and limits, and [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) for the
full model.

---

## Soft vs hardened mode

The engine ships in two modes, controlled by a build knob:

| Mode               | How the hook invokes the engine | Ships in git?                               |
| ------------------ | ------------------------------- | ------------------------------------------- |
| **Soft** (default) | `bun run harness-setup.ts`      | Yes — readable TypeScript source            |
| **Hardened**       | `dist/harness-setup` binary     | No — built on demand, `dist/` is gitignored |

To build the hardened binary:

```bash
bun run build:hardened
# Cross-build for Linux CI:
bun run scripts/build-hardened.ts bun-linux-x64
```

**Honesty caveat:** the hardened binary is **not enforcement**. It only hardens
the tooling against accidental or trivial edits to the TypeScript source. Real
enforcement is the `permissions.deny` list in `settings.json`, and only the
**managed scope** is truly non-bypassable. Never describe the binary as
tamper-proof. (See [ADR-0003](docs/adr/0003-soft-vs-hardened-compile-knob.md).)

---

## Run the tests

```bash
bun test
```

All tests run against a temporary isolated HOME (via `HARNESS_HOME`). They never
touch your real `~/.claude`.

```
bun test v1.3.14
tests/harness-setup.*.test.ts            [pass]   engine: check/apply/idempotence/backup/hardened-parity
tests/guard-command.test.ts              [pass]   guardrail hooks
tests/guard-secret.test.ts               [pass]
tests/guard-write-secret.test.ts         [pass]
tests/guard-prompt.test.ts               [pass]
tests/hook-lib.test.ts                   [pass]
390 pass, 0 fail
```

---

## Repository structure

```
plugins/jrobic-cc-harness-setup-example/
  commands/harness-setup.md     /harness-setup command (EN, confirm-before-write)
  skills/harness-setup/SKILL.md ambient skill (setup/configure/verify/audit intents)
  hooks/hooks.json              SessionStart nudge + 4 guardrail hooks (PreToolUse/UserPromptSubmit)
  .mcp.json                     MCP servers: example (live, no auth) + datadog (needs setup)
  scripts/harness-setup.ts      THE ENGINE — idempotent check/apply, zero deps
  scripts/guard-command.ts      PreToolUse/Bash: block destructive/exfil/escalation, ask on risky git
  scripts/guard-secret.ts       PreToolUse: block reads of secret files (symlink-resolved)
  scripts/guard-write-secret.ts PreToolUse: block writing hardcoded secret values
  scripts/guard-prompt.ts       UserPromptSubmit: warn on prompt-injection signatures
  scripts/_shared/hook-lib.ts   shared hook harness (deny/ask, rotated 0600 logs, fail-open)
  reference/deny.json           source of truth for deny rules
  reference/CONTEXT.md          team context template (copied into ~/.claude/harness/)
scripts/
  build-hardened.ts             bun build --compile → dist/harness-setup
  set-mode.ts                   flip hook/command between soft and hardened
tests/                          bun test suite (isolated HOME)
.github/workflows/ci.yml        CI: lint + format check + bun test
```

---

## Further reading

- [`docs/how-it-works.md`](docs/how-it-works.md) — architecture walk-through with diagrams (three layers, check/apply flow, scope precedence, soft/hardened, MCP servers) · 🇫🇷 [version française](docs/how-it-works.fr.md)
- [`docs/guardrails.md`](docs/guardrails.md) — the guardrail hooks: what they do, what they protect, how they behave (block / ask / warn) · 🇫🇷 [version française](docs/guardrails.fr.md)
- [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) — what is and isn't defended, known bypasses, trust assumptions
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — conventional commits, local hooks (Lefthook), and automated releases (semantic-release in CI)
- [`docs/demo-setup.md`](docs/demo-setup.md) — demo runbook: launch Claude Code in a fresh isolated state (alias-based), walk-through, reset · 🇫🇷 [version française](docs/demo-setup.fr.md)
- [`docs/infographic-brief.md`](docs/infographic-brief.md) — onboarding infographic brief (ready-to-paste prompt for Claude Design)
- [`CONTEXT.md`](CONTEXT.md) — domain glossary (harness, three layers, deny vs context, etc.)
- [`docs/adr/`](docs/adr/) — architecture decision records (ADR-0001..0004)
- [`docs/specs/harness-setup-example/`](docs/specs/harness-setup-example/) — requirements, design, tasks

---

## License

MIT — see [`LICENSE`](LICENSE).
