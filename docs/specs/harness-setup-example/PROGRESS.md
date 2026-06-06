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
| 4. Tasks + IMPL | ⏳ tasks written, build not started | `tasks.md` — T-a…T-j; no application code yet |
| 5. Validate | ⏸ not started | — |

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

1. **Human gate** on the structural choices (ADR-0001..0004) and the file plan in
   `design.md` §2 before any code.
2. Resolve the open questions below (a couple block naming/format details).
3. Start BUILD at **T-a1** (scaffold), then the engine critical path
   (T-b1 → T-b8) tests-first.
4. `git init` locally + create the feature branch before the first commit (repo
   has no local git yet).

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
