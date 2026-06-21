# PROGRESS — harness-setup-example

Single source of truth for "where we are". Update this on every task completion
and at the end of every session.

**Change:** harness-setup-example (Phase 1 — OSS skeleton)
**Last updated:** 2026-06-21 (session 7 — docs reconciliation + guardrails internals reference, branch `docs/reconcile-guardrails`)
**Current phase:** **Guardrail hooks Lot 1 SHIPPED** — merged via PR #2 and
released as **v0.2.0** (tag `v0.2.0`, commit `b1705f9`; `plugin.json` bumped).
The release pipeline was hardened along the way (PRs #3–#5) to push the bump
commit past `main`'s signed-commit ruleset — see the Lot 1 entry in NEXT STEPS
and `CONTRIBUTING.md` § Releases. 390 tests, reviewer APPROVE.

## Phase 2 — demo enhancements (session 3, 2026-06-16)

- Repo promoted: `main` is now the default branch (no PR — repo genesis); the
  redundant `feat/phase1-oss-skeleton` branch was deleted.
- **Tooling layer split (decided 2026-06-16, user):**
  - **Datadog → MCP server.** Plugin `.mcp.json` declares the **official Datadog
    MCP** (`type: http`, OAuth at runtime, no committed secret). Endpoint is
    org/site-specific, left as `${DATADOG_MCP_URL}` (unset → declared-but-
    unconnected in `/mcp`). Recommended install path is Datadog's own plugin
    (`/plugin install datadog@claude-plugins-official` + `/ddsetup`).
  - **GitLab & AWS → CLI + skill (NOT built yet).** `glab` and the `aws` CLI
    already cover the ground, so these will be **skills wrapping the CLI**, not
    MCP servers. Planned for a later session under `plugins/.../skills/`.
  - Earlier idea (GitLab/AWS/Datadog all as `npx`/`uvx` MCP skeletons) was
    dropped in favour of this split.
- **`docs/how-it-works.md`** (+ **FR** `how-it-works.fr.md`) — architecture
  walk-through with 6 Mermaid diagrams (three layers, plugin vs out-of-plugin
  writes, check/apply sequence, scope precedence, tooling MCP-vs-CLI split,
  soft/hardened).
- **`docs/infographic-brief.md`** — onboarding infographic brief (new MacBook →
  install Claude → add plugin → `/harness-setup`). Now carries **3 paste-ready
  aesthetic variants** for A/B testing in Claude Design: **A — Plasma** (warm
  paper, terracotta accent `#D97757` / sage future `#788C5D`, Inter + JetBrains
  Mono, adopted from the user's Plasma infographic), **B — hand-drawn notebook**
  (Caveat + mono), **C — dark mode tech** (IDE/terminal, cyan accent). Content
  shared: install panel includes **Bun** (engine prereq); guardrail hooks
  (PreToolUse secret-leak / denied commands) shown as **roadmap/future**, never
  an applied tick (honesty).
- **`docs/demo-setup.md`** (+ **FR** `demo-setup.fr.md`) — demo runbook: alias
  launching Claude Code in a fresh isolated state (`CLAUDE_CONFIG_DIR` +
  `HARNESS_HOME` aligned on `~/claude-demo`), live walk-through, isolation check,
  reset, Keychain auth note. EN primary for the OSS, FR variant alongside.
- **Framing locked (user, 2026-06-16):** the harness is the **team's minimal
  baseline** installed in one command; the dev/devops then **adds their own
  plugins/skills/MCP** on top. "harness" and "guardrails" are apt terms;
  "secured" was too strong and was dropped. End goal of the guardrails =
  **hooks** that detect secret leaks / block denied commands (future phase).
- README updated (tooling section, Further reading links, repo structure).
- Gate: `bun test` 35/35, `oxlint` 0, `dprint check` clean.

### Live demo findings + fixes (2026-06-16, pushed to `main`)

- **`fix(manifests)` (commit `8fb3b90`):** `marketplace.json` `owner` and
  `plugin.json` `author` must be JSON **objects**, not strings — the string form
  failed `/plugin marketplace add` with "expected object, received string".
- **`fix(engine)` (commit `82c2fec`):** during the demo it was unclear whether the
  engine targeted the real `~/.claude` or the isolated demo home. Root cause: in
  the sandboxed demo session `$HOME` itself was overridden to `~/claude-demo`
  (not `HARNESS_HOME`), so `os.homedir()` correctly pointed at the demo dir —
  isolation held, but invisibly. Fixes: `check`/`apply` now print the resolved
  home (`... (home: <dir>)`); the command/skill locate the engine under
  `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins` and stop hardcoding `~/.claude`
  in user-facing text. Regression test added → **36 tests pass**.
- **Confirm prompt → `AskUserQuestion`:** the command + skill now ask for
  confirmation through the structured `AskUserQuestion` tool (options **Apply** /
  **Cancel**) instead of free-text "yes/no", with a typed-confirmation fallback
  for headless runs.
- **Visible demo MCP (`example` server):** the Datadog-only `.mcp.json` showed
  nothing in `/mcp` — an `http` server with an unset `${DATADOG_MCP_URL}`
  silently fails (Claude Code doesn't resolve the empty var) and never appears.
  Added a second server, **`example`** =
  `@modelcontextprotocol/server-everything` (stdio via `npx`, **no auth**), which
  connects out of the box so `/mcp` visibly shows a live MCP with example tools.
  Verified locally via a real `initialize` + `tools/list` handshake (13 tools).
  Datadog stays as the realistic "needs `/ddsetup`" example. Pre-warm tip added
  to the demo runbook.

- **Plugin updates pinned by version:** during iteration, `/plugin marketplace
  update` reported "already up to date" because `plugin.json` pinned
  `"version": "0.1.0"` (unchanged across commits). Fix: **removed `version`** so
  installs track the **git commit SHA** — every push to `main` is now detected as
  an update. Re-pin a semver when cutting a stable release. (One-time: do a full
  marketplace remove + re-add to pull this change, then `update` works going
  forward.)

### Release automation — MERGED to `main` (PR #1 `1e6a43b`, session 5, 2026-06-16)

> Status update: this layer is now **live on `main`**, baseline tag `v0.1.0`
> seeded. CI `release.yml` + `ci.yml` present; `lefthook.yml`, `.commitlintrc.json`,
> `.releaserc.json`, `scripts/sync-version.mjs`, `CONTRIBUTING.md` all in place.
> Next `feat:` → `v0.2.0`, next `fix:` → `v0.1.1` (semantic-release on push).

Decided to do versioning **properly via CI** rather than a local push hook
(semantic-release needs commits already on `main`, creates tags/releases, needs a
token → its home is CI, not a `pre-push` hook). This **reverses** the earlier
"drop version / track SHA" choice — `version` is back in `plugin.json`, now
auto-managed.

- **CI** — [`.github/workflows/release.yml`](../../../.github/workflows/release.yml):
  on push to `main`, runs the quality gate then **semantic-release** (Node
  runtime) → bumps `package.json` + `plugin.json` (via `scripts/sync-version.mjs`),
  writes `CHANGELOG.md`, tags `vX.Y.Z`, creates a GitHub release, commits back
  `[skip ci]`. Config in [`.releaserc.json`](../../../.releaserc.json).
- **Local hygiene** — `lefthook.yml` + `.commitlintrc.json`: `commit-msg` →
  commitlint, `pre-commit` → dprint + oxlint, `pre-push` → bun test. Installed
  automatically by the `prepare` script on `bun install`.
- **Docs** — [`CONTRIBUTING.md`](../../../CONTRIBUTING.md): conventional-commit →
  release-type table, hooks, branching, the baseline-tag seeding step.
- **Caveat** — semantic-release only releases on `feat`/`fix`/breaking; `docs`/
  `chore`/etc. do **not** bump. Behaviour changes (engine/command/skill/.mcp.json/
  deny.json) must be `feat`/`fix`. Seed `v0.1.0` once so the first release
  continues from 0.1.0 (else it jumps to 1.0.0). Verified locally: commitlint
  accept/reject, `sync-version.mjs`, 36 tests, dprint/oxlint clean.

### Phase 2 backlog (not yet built)

> Full tooling survey + Skill/MCP/Hook verdict for every DevOps tool considered:
> [`phase2-tooling.md`](./phase2-tooling.md). The harness's real differentiator
> is the **guardrail hooks layer**, not the CLI wrappers — recommended first
> build = secret-leak + deny-runtime hooks.

- `skills/gitlab/` — skill wrapping `glab` (MRs, pipelines, issues).
- `skills/aws/` — skill wrapping the `aws` CLI (scoped, read-first).

---

## Phase status

| Phase                      | State                                                 | Notes                                                                                                     |
| -------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1. Brief                   | ✅ done                                               | Validated by PM + user decisions (see brief in journal)                                                   |
| 2. Requirements (EARS)     | ✅ done                                               | `requirements.md` — R1…R15                                                                                |
| 3. Design (boundary-first) | ✅ done                                               | `design.md` — file plan, engine contract, soft/hardened, Docker, write schemas; references ADR-0001..0004 |
| 4. Tasks + IMPL            | ✅ done — all T-a/T-b/T-c/T-d/T-e/T-f/T-g/T-h/T-i/T-j | `tasks.md` — all non-opt checked; opts T-c3/T-j1/T-j2 also done                                           |
| 5. Validate                | ✅ done                                               | reviewer: REQUEST_CHANGES → F1–F5 addressed; 35 tests, oxlint+dprint+grep gate clean; R10.3 now proven    |

## Artifacts produced (BUILD phase — session 2, 2026-06-06)

### Tooling (T-c) — complete

- `/plugins/jrobic-cc-harness-setup-example/hooks/hooks.json` — SessionStart nudge, soft mode,
  `${CLAUDE_PLUGIN_ROOT}`, exit-3 nudge, nothing on exit-0
- `/scripts/build-hardened.ts` — `bun build --compile`, cross-target support documented, `dist/`
  gitignored
- `/scripts/set-mode.ts` (opt) — flips hooks.json between soft/hardened invocation

**T-c4 hardened verification + review fix (R10.3 now genuinely met):**

Initial build exposed a real defect (caught by the reviewer, F1): the engine read
`reference/deny.json` and `reference/CONTEXT.md` from the filesystem relative to
the engine file. Inside a `bun build --compile` binary those paths point into the
virtual `$bunfs`, which has no sidecar files, so:

- hardened `check` read `refDeny = []` → reported **"deny list: up to date" for any
  machine** (a silent false-compliance — worse than the originally-noted `apply`
  bug);
- hardened `apply` crashed on `copyFileSync` of `CONTEXT.md` (ENOENT).

**Fix applied:** reference data is now **embedded at build time via imports**
(`import refDenyData from "../reference/deny.json"` and
`import refContextText from "../reference/CONTEXT.md" with { type: "text" }`), and
`apply` writes the embedded text instead of `copyFileSync` from a sidecar. Soft
and hardened are now byte-identical in behaviour.

Regression guard added: `tests/harness-setup.hardened-parity.test.ts` builds the
real binary and asserts check(3)→apply(0)→check(0) + the 11 embedded deny rules +
context written. **35 tests pass / 0 fail.** `dist/` stays gitignored / cleaned.

Residual constraint (documented, not a bug): `set-mode.ts` resolves the hardened
binary as `../../dist/harness-setup` relative to the plugin root, which only holds
in a checked-out repo. Once the plugin is installed under `~/.claude/plugins/…`
there is no `dist/`, so hardened mode is a repo-local demo, not an install-time
feature (ADR-0003).

### Command + skill (T-e) — complete

- `/plugins/jrobic-cc-harness-setup-example/commands/harness-setup.md` — EN, `${CLAUDE_PLUGIN_ROOT}` +
  FS fallback, confirm-before-write, no invented deny rules
- `/plugins/jrobic-cc-harness-setup-example/skills/harness-setup/SKILL.md` — EN, trigger on
  setup/configure/verify/audit intents, same confirm-before-write flow

### Tests gate (T-f) — complete

**bun test result: 32 pass, 0 fail (33 ms)**

`oxlint`: 0 errors, 0 warnings (after fixing `no-undef Bun`, `no-unused-vars`,
`no-useless-fallback-in-spread`)

`dprint check`: 0 differences (after import-order fix and auto-fmt)

oxlint and dprint added as devDependencies: `oxlint@1.68.0`, `dprint@0.54.0`

### Docker + devcontainer (T-g) — complete

- `/docker/Dockerfile` — Bun 1.3.14-slim base, non-root `harness` user, installs
  `@anthropic-ai/claude-code` via Node 20, `HARNESS_HOME` isolation, default entrypoint =
  engine demo (no auth), full live flow documented
- `/.devcontainer/devcontainer.json` — thin wrapper, no duplicated build logic
- `/docker/README.md` — how to build/run, engine demo + full live flow

**Docker build result:** succeeded (image `harness-demo`)

**Docker engine demo (verbatim):**

```
=== Harness engine demo (isolated HOME: $HARNESS_HOME) ===

--- check (expect exit 3: configuration incomplete) ---
Harness — configuration status
  ✗ deny list: 11 missing rule(s): [...]
  ✗ CLAUDE.md context: import absent

--- apply ---
✓ Harness applied (backups .bak-… created for any modified file).

--- check again (expect exit 0: configuration complete) ---
Harness — configuration status
  ✓ deny list: up to date
  ✓ CLAUDE.md context: import present
```

### CI (T-h) — complete

- `/.github/workflows/ci.yml` — push/PR → setup Bun 1.3.14 → oxlint → dprint check → bun test

### README + grep gate (T-i) — complete

- `/README.md` — EN, pitch, three layers, public + private HTTPS install, `/harness-setup` flow,
  soft/hardened with honesty caveat, Docker demo (engine + live flow), `bun test`, repo structure
- Grep gate: no hits for `interne|cyber|DSI|CCOE|RATP|Marolles|gitlab.interne|glab|Bedrock`.
  `MDM` appears only in generic EN context (Phase 2 concept). No `BRIEF.md` in repo.

### Optional extras (T-j) — complete

- `/examples/clone-and-go/.claude/settings.json` — `extraKnownMarketplaces` skeleton example
- `/PRESENTATION.md` — talk track: 3 layers, deny≠context, scope merge, `${CLAUDE_PLUGIN_ROOT}`
  trap, clone & go, soft/hardened caveat; reproducible demo steps

---

## Artifacts produced (BUILD phase — session 1, 2026-06-06)

### Scaffold (T-a1…T-a6) — complete

- `/package.json` — name, Bun engines, scripts (test / build:hardened / engine:check / engine:apply)
- `/.gitignore` — dist/, \*.bak-\*, node_modules/
- `/LICENSE` — MIT, author jrobic, 2026
- `/dprint.json` — formatter config (TypeScript / JSON / Markdown)
- `/.oxlintrc.json` — linter config (stack defaults + Bun globals)
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

**Cleanup (2026-06-17):** removed `docker/`, `.devcontainer/`, and
`examples/clone-and-go/`. The local-alias demo (`docs/demo-setup.md`) covers the
demo need, so the Docker image + devcontainer were dead weight — this **reverses
OQ-5 / R12.3 / T-g** ("CLI in the Docker image" live-flow decision). Also fixed
the root `.claude/settings.json` to the correct `extraKnownMarketplaces` schema
(object keyed by name + `source: { source: "github", repo }`, `$schema` →
schemastore); `examples/clone-and-go` was a redundant, wrong-schema copy of it.

**Baseline complete & on `main`** — Phase 1 skeleton + Phase 2 demo enhancements
(MCP `example`/Datadog, `AskUserQuestion` confirm, how-it-works/demo/infographic
docs) + release automation (semantic-release, lefthook, commitlint) all merged.
Tag `v0.1.0`. Nothing in flight; repo is at a clean, presentation-ready state.

Full tooling survey + verdict: [`phase2-tooling.md`](./phase2-tooling.md)
(Skill|MCP|Hook rule, two-baseline model public-skeleton vs private-fork,
second-brain layer, guardrails plan).

**BUILT — Guardrail hooks, Lot 1 (2026-06-17, branch `feat/phase2-guardrails`).**
**Pivot:** instead of the from-scratch starter, we **ported the user's
battle-tested global hooks** (`~/.claude/hooks`) and de-internalized them
(DRY/AHA — far more mature, tested against known bypasses). Then extended with
the genuinely-new pieces. Shipped (public baseline):

- `scripts/_shared/hook-lib.ts` — `runHook` harness (deny/ask, 0o600 rotated
  logs, fail-open, `readStringField`). Ported.
- `scripts/guard-command.ts` (PreToolUse Bash) — deny destruction / exfiltration
  / escalation; **git-by-inversion** ask (SAFE_GIT allowlist → everything else
  ask). Ported. Supersedes the merged deny+destructive starter.
- `scripts/guard-secret.ts` (PreToolUse Read/Edit/Write/MultiEdit/NotebookEdit/
  Grep/Glob/Bash) — deny secret-file reads, 14 PathRules + Bash path tokenization
  - URL-creds + git-leak, symlink-resolved. Ported. Richer than static `deny.json`.
- `scripts/guard-write-secret.ts` (PreToolUse Write/Edit/MultiEdit) — **NEW** —
  deny hardcoded secret VALUES before write (8 high-signal token shapes; regex,
  fast). Write-side complement to guard-secret's read-side.
- `scripts/guard-prompt.ts` (UserPromptSubmit) — **NEW** (the global set lacked
  it; IMPROVEMENTS #5) — warn on injection signatures via `additionalContext`,
  non-blocking by design.
- `docs/THREAT_MODEL.md` — de-internalized; documents the static (`deny.json`) vs
  dynamic (hooks) two-layer model, what's defended / known bypasses.
- `lefthook.yml` pre-commit — conditional `gitleaks protect --staged` (deep net;
  skips cleanly if gitleaks absent). `.gitignore += *.log`.
- `hooks/hooks.json` wires all four (timeout 5s each).

Contract verified via `claude-code-guide`: PreToolUse `permissionDecision`
deny/ask, allow = silent; UserPromptSubmit `additionalContext` on exit 0; all
fail-open. **Gate: 388 tests pass, oxlint + dprint + de-internalization grep all
clean.** `feat:` → triggers **v0.2.0**.

Deferred (not in Lot 1):

- **linters-auto** (hadolint/shellcheck/actionlint PostToolUse) — dropped from
  Lot 1 (hygiene < security; the port took priority). Easy follow-up.
- IaC gate (Trivy/Checkov, P2) + policy gate (conftest/OPA, P3) — private fork.
- Optional escalations: Prompt Guard 2 model (injection), gitleaks-everywhere.
- ~~README / how-it-works reconciliation (surface the hooks + link THREAT_MODEL).~~
  **DONE 2026-06-21** (branch `docs/reconcile-guardrails`, commits `6ef7252` +
  `17fa2dd`): README repo-structure + test block refreshed (4 guards, hook-lib,
  390 tests); how-it-works (EN/FR) gained a "Guardrail hooks" §6 (block/ask/warn
  Mermaid + table + links to `guardrails.md` / `THREAT_MODEL.md`). Also removed
  the dead `docs/infographic-brief.md` + its 5 cross-references (user decision).
  Docs-only → no semantic-release bump. `dprint check` clean.
- **DONE 2026-06-21 — guardrails internals reference** (commit `de70181`): new
  `docs/guardrails-internals.md` + `.fr.md` — code-level walk-through of all four
  hooks for anyone modifying/extending a guard. Covers the `runHook` contract
  (deny/ask via stdout, exit 0, fail-open, 0600 rotated logs) and every rule with
  its regex (rm -rf logic, 18 BASH_RULES, git ask-by-inversion, 14 secret
  PATH_RULES, 8 write-side SECRET_RULES, 6 prompt signatures), plus 4 Mermaid
  diagrams (routing, runHook lifecycle, guard-command decision, guard-secret
  dispatch), worked-example tables, an end-to-end trace, a how-to-add-a-rule
  guide, and §3.5 on why MCP tools aren't covered (matcher + `inspect` default)
  with the least-privilege mitigation. Linked from `guardrails.md` + README.
  Docs-only.
- `skills/gitlab/` (`glab`) + `skills/aws/` (`aws` CLI) — private fork infra.
- Second brain (qmd/graphify/claude-mem) + efficiency (caveman/rtk) — private fork.
- Hardened mode post-install (ADR-0003); Managed/MDM promotion.
- 2 ADRs to write: 0005 (Skill|MCP|Hook), 0006 (public-skeleton vs private-fork).

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
- **2026-06-06 (session 2)** — Tooling + infra complete: hooks, build-hardened,
  set-mode, command, skill, Docker (full live flow + engine demo), devcontainer,
  CI, README, grep gate, examples, PRESENTATION. Discovered: `bun build --compile`
  cannot embed runtime-referenced files (deny.json, CONTEXT.md) via `copyFileSync`
  from a relative path — hardened `check` exit codes match soft, hardened `apply`
  fails on context copy. Documented in PROGRESS and ADR-0003 scope. oxlint +
  dprint both pass clean. bun test: 32/32.
- **2026-06-06 (review fix)** — Reviewer verdict REQUEST_CHANGES. F1 (🔴): the
  filesystem read of the reference made hardened `check` falsely report
  compliance and hardened `apply` crash. Fixed by embedding `deny.json` +
  `CONTEXT.md` via imports (JSON + text), writing the embedded context instead of
  copying a sidecar — soft/hardened now byte-identical (R10.3). Added
  `hardened-parity.test.ts` (builds the binary, asserts parity). F2: corrected the
  `set-mode.ts` hardened binary path `../../../dist` → `../../dist`, documented the
  repo-local layout constraint. F3: PROGRESS honesty corrected (deny audit, not
  just apply, was broken). F4: removed dead test code. F5: apply summary now lists
  only the files actually backed up. **bun test: 35/35, oxlint + dprint clean.**
