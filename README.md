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

## Docker demo

The demo image runs the full `check → apply` cycle against an **isolated HOME**
so your real `~/.claude` is never touched.

### Engine-only demo (no auth required)

```bash
docker build -t harness-demo -f docker/Dockerfile .
docker run --rm harness-demo
```

Expected output: `check` exits 3 (incomplete), `apply` merges the deny rules and
writes the context import, second `check` exits 0 (complete).

### Full live flow (requires ANTHROPIC_API_KEY)

> Note: this flow depends on the Claude Code CLI being installed in the image.
> The `docker/Dockerfile` installs `@anthropic-ai/claude-code` via npm, but the
> CLI requires a valid `ANTHROPIC_API_KEY` at runtime. The engine-only demo above
> works without any API key and demonstrates identical deny/context behaviour.

```bash
docker run --rm -it -e ANTHROPIC_API_KEY=sk-ant-... harness-demo bash
# Inside the container:
claude plugin marketplace add /app
claude plugin install jrobic-cc-harness-setup-example
claude   # then run /harness-setup
```

Auth is passed via env var at runtime. No API key is ever committed to this
repository or baked into the image.

See [`docker/README.md`](docker/README.md) for more details.

---

## Run the tests

```bash
bun test
```

All tests run against a temporary isolated HOME (via `HARNESS_HOME`). They never
touch your real `~/.claude`.

```
bun test v1.3.14
tests/harness-setup.check.test.ts        [pass]
tests/harness-setup.apply.test.ts        [pass]
tests/harness-setup.idempotence.test.ts  [pass]
tests/harness-setup.backup.test.ts       [pass]
32 pass, 0 fail
```

---

## Repository structure

```
plugins/jrobic-cc-harness-setup-example/
  commands/harness-setup.md     /harness-setup command (EN, confirm-before-write)
  skills/harness-setup/SKILL.md ambient skill (setup/configure/verify/audit intents)
  hooks/hooks.json              SessionStart nudge hook
  scripts/harness-setup.ts      THE ENGINE — idempotent check/apply, zero deps
  reference/deny.json           source of truth for deny rules
  reference/CONTEXT.md          team context template (copied into ~/.claude/harness/)
scripts/
  build-hardened.ts             bun build --compile → dist/harness-setup
  set-mode.ts                   flip hook/command between soft and hardened
tests/                          bun test suite (isolated HOME)
docker/Dockerfile               demo image (engine-only + full live flow)
.devcontainer/devcontainer.json thin devcontainer wrapper
.github/workflows/ci.yml        CI: lint + format check + bun test
```

---

## Further reading

- [`CONTEXT.md`](CONTEXT.md) — domain glossary (harness, three layers, deny vs context, etc.)
- [`docs/adr/`](docs/adr/) — architecture decision records (ADR-0001..0004)
- [`docs/specs/harness-setup-example/`](docs/specs/harness-setup-example/) — requirements, design, tasks

---

## License

MIT — see [`LICENSE`](LICENSE).
