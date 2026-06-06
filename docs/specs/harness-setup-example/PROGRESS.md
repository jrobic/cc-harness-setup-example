# PROGRESS — harness-setup-example

Single source of truth for "where we are". Update this on every task completion
and at the end of every session.

**Change:** harness-setup-example (Phase 1 — OSS skeleton)
**Last updated:** 2026-06-06
**Current phase:** BUILD started (gate passed) — scaffold + engine critical path

---

## Phase status

| Phase | State | Notes |
|-------|-------|-------|
| 1. Brief | ✅ done | Validated by PM + user decisions (see brief in journal) |
| 2. Requirements (EARS) | ✅ done | `requirements.md` — R1…R15 |
| 3. Design (boundary-first) | ✅ done | `design.md` — file plan, engine contract, soft/hardened, Docker, write schemas; references ADR-0001..0004 |
| 4. Tasks + IMPL | ⏳ scaffold + engine complete (T-a/T-b/T-d done) | `tasks.md` — T-c/T-e/T-f/T-g/T-h/T-i/T-j remain |
| 5. Validate | ⏸ not started | — |

## Artifacts produced (BUILD phase — 2026-06-06)

### Scaffold (T-a1…T-a6) — complete
- `/package.json` — name, Bun engines, scripts (test / build:hardened / engine:check / engine:apply)
- `/.gitignore` — dist/, *.bak-*, node_modules/
- `/LICENSE` — MIT, author jrobic, 2026
- `/dprint.json` — formatter config (TypeScript / JSON / Markdown)
- `/.oxlintrc.json` — linter config (stack defaults)
- `/.claude-plugin/marketplace.json` — generic owner, advertises jrobic-cc-harness-setup-example
- `/plugins/jrobic-cc-harness-setup-example/.claude-plugin/plugin.json` — generic author handle jrobic, EN description
- `/plugins/jrobic-cc-harness-setup-example/.mcp.json` — empty mcpServers, Phase 2 placeholder noted
- `/.claude/settings.json` — extraKnownMarketplaces pointing this repo (clone & go)

### Engine (T-b1…T-b8) — complete
- `/tests/helpers/tmp-home.ts` — isolated HOME builder (HARNESS_HOME seam)
- `/tests/harness-setup.check.test.ts` — 9 tests, all green
- `/tests/harness-setup.apply.test.ts` — 10 tests, all green
- `/tests/harness-setup.idempotence.test.ts` — 6 tests, all green
- `/tests/harness-setup.backup.test.ts` — 7 tests, all green
- `/plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts` — full engine, shebang, main() returns exit code

**bun test result: 32 pass, 0 fail (34 ms)**

### Reference data (T-d1, T-d2) — complete
- `/plugins/jrobic-cc-harness-setup-example/reference/deny.json` — 11 generic secret/credential read-block rules
- `/plugins/jrobic-cc-harness-setup-example/reference/CONTEXT.md` — EN example team context, deny ≠ context note, no internal references

---

## Artifacts produced (SPEC phase)

- `/CONTEXT.md` — domain glossary (EN, tool-agnostic).
- `/docs/adr/0001-repo-as-marketplace-and-plugin.md`
- `/docs/adr/0002-bun-runtime-for-the-engine.md`
- `/docs/adr/0003-soft-vs-hardened-compile-knob.md`
- `/docs/adr/0004-generic-public-and-private-install.md`
- `/docs/adr/README.md` (index)
- `/docs/specs/harness-setup-example/requirements.md`
- `/docs/specs/harness-setup-example/design.md`
- `/docs/specs/harness-setup-example/tasks.md`
- `/docs/specs/harness-setup-example/PROGRESS.md` (this file)

## NEXT STEPS

**Next build session (scope: tooling + infra)**

1. **T-c1** — `hooks.json` (SessionStart nudge, soft mode invocation, `${CLAUDE_PLUGIN_ROOT}`)
2. **T-c2** — `scripts/build-hardened.ts` (bun build --compile); wire `build:hardened` script
3. **T-c4** — verify hardened binary produces identical exit codes to soft mode
4. **T-e1** — `commands/harness-setup.md` (EN, filesystem fallback for `${CLAUDE_PLUGIN_ROOT}`, confirm-before-write)
5. **T-e2** — `skills/harness-setup/SKILL.md` (EN, same confirm-before-write flow)
6. **T-f1** — ensure all tests pass on a clean `bun test` from repo root (already green, mark done)
7. **T-g1** — `docker/Dockerfile` (Bun base, isolated HOME/HARNESS_HOME, engine demo)
8. **T-g2** — `.devcontainer/devcontainer.json` thin wrapper
9. **T-h1** — `.github/workflows/ci.yml` (push/PR → oxlint + dprint check + bun test)
10. **T-i1** — `README.md` (EN, what/why, install public + private HTTPS, soft/hardened caveat, Docker demo, bun test)
11. **T-i2** — de-internalisation grep gate (no internal host/CLI/CA/org/model/MDM references)

**Optional (T-c3, T-j1, T-j2) last.**

## Open questions — RESOLVED (2026-06-06, user)

- **OQ-1 (env var name):** ✅ `HARNESS_HOME` confirmed as the isolation override.
- **OQ-2 (LICENSE):** ✅ **MIT**.
- **OQ-3 (default mode):** ✅ soft is default; hardened binaries are **NOT** committed
  to git (built on demand / CI artifact). `dist/` is gitignored.
- **OQ-4 (managed import path):** ✅ keep `@~/.claude/harness/CONTEXT.md` (POC path).
- **OQ-5 (CLI in Docker):** ✅ **CLI IN the image** — full live flow
  (clone→install→`/harness-setup`) inside an isolated HOME. Auth provided at
  `docker run` time via env var (e.g. `ANTHROPIC_API_KEY`), **never committed**.
  Engine-only demo kept as documented fallback if auth is unavailable live.

## Decisions journal

- **2026-06-06** — Adopted ADR-0001..0004. Repo = marketplace + single plugin
  `jrobic-cc-harness-setup-example`; Bun runtime; soft/hardened compile knob with
  the explicit "compile ≠ enforcement" caveat; generic public + private install,
  all internal references cut.
- **2026-06-06** — Confirmed scope split: Phase 1 = de-internalised EN Bun
  skeleton (engine, knob, Docker, marketplace+plugin, command+skill, nudge hook,
  reference data, tests, CI, README). Phase 2+ = real business
  hooks/skills/agents/MCP, managed/MDM promotion, populated `.mcp.json`.
- **2026-06-06** — Engine port: Node `.mjs` → Bun `.ts`; messages translated to
  English; home resolved from env for isolation; exit-code contract fixed at
  0/2/3 (carried from POC).
- **2026-06-06** — `BRIEF.md` (internal) will NOT be shipped; de-internalisation
  enforced by a grep gate (T-i2).
- **2026-06-06** — Open questions resolved by user: `HARNESS_HOME`, MIT, hardened
  binaries out of git, POC import path kept, **Claude Code CLI installed in the
  Docker demo image** (auth via runtime env var, no secrets committed). This
  upgrades R12.3 / T-g1 / T-g3 from "engine-only, CLI conditional" to "full live
  flow in-container, engine-only as fallback".
- **2026-06-06** — BUILD gate passed. Tooling verified: bun 1.3.14, git, docker,
  node present. Starting BUILD at T-a1.
