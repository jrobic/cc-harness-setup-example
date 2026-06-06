# Tasks — harness-setup-example

Atomic tasks for the BUILD phase, ordered by dependency. Each is small enough for
one TDD iteration. `_Depends:_` lists prerequisite task IDs. Check a box when the
task is done **and** update `PROGRESS.md`.

Convention: tests-first where a task produces engine behaviour (see
[`testing`] discipline). `(opt)` = optional / Phase-1 stretch.

Requirement IDs (`R…`) refer to `requirements.md`; ADRs to `../../adr/`.

---

## (a) Scaffold: repo, marketplace, plugin

- [x] **T-a1** Initialise repo root: `package.json` (name, Bun `engines`, scripts
  `test`/`build:hardened`/`engine:check`/`engine:apply`), `.gitignore`
  (`dist/`, `*.bak-*`, `node_modules/`), `LICENSE`.
  _Depends:_ —
- [x] **T-a2** Add formatter/linter config: `dprint.json`, `.oxlintrc.json`
  (per stack defaults). _Depends:_ T-a1
- [x] **T-a3** Create `.claude-plugin/marketplace.json` advertising the single
  plugin `jrobic-cc-harness-setup-example` with a **generic** owner (no internal
  org/email). (ADR-0001, R11.3) _Depends:_ T-a1
- [x] **T-a4** Create `plugins/jrobic-cc-harness-setup-example/.claude-plugin/plugin.json`
  with a **generic** author handle (`jrobic`), English description. (ADR-0001,
  R11.3) _Depends:_ T-a3
- [x] **T-a5** Create `plugins/.../.mcp.json` = `{ "mcpServers": {} }` with a
  comment/doc note marking it a Phase 2 placeholder. (R15.1) _Depends:_ T-a4
- [x] **T-a6** Add clone & go: `.claude/settings.json` at repo root declaring this
  repo via `extraKnownMarketplaces`. (CONTEXT: clone & go) _Depends:_ T-a3

## (b) Port the engine Node → Bun TS (tests-first)

- [x] **T-b1** Add `tests/helpers/tmp-home.ts`: builds an isolated HOME (temp
  dir), seeds optional `settings.json` / `CLAUDE.md`, returns paths; used by all
  engine tests. (R7, R13.2) _Depends:_ T-a1
- [x] **T-b2** Write failing tests for `check`: exit `0` complete, `3` incomplete,
  `2` invalid JSON, missing files treated as empty. (R1, R13.1)
  _Depends:_ T-b1
- [x] **T-b3** Implement `harness-setup.ts` skeleton: CLI parse, `resolveHome(env)`
  with `HARNESS_HOME` override (R7), reference-dir resolution, `readJson`/
  `readText`, `report`, `check` path + exit codes. Make T-b2 pass.
  (R1, R7) _Depends:_ T-b2
- [x] **T-b4** Write failing tests for `apply`: deny concat + dedup, unrelated
  deny preserved, context file copied, single managed import block. (R2, R4, R5)
  _Depends:_ T-b3
- [x] **T-b5** Implement `apply`: `backup`, deny merge, context copy,
  `ensureImportBlock`. Make T-b4 pass. Write only the three target files. (R2,
  R4, R5) _Depends:_ T-b4
- [x] **T-b6** Write + pass idempotence tests: second `apply` no-op, no duplicate
  deny, exactly one import, import-outside-markers not duplicated, `check` after
  `apply` exits `0`. (R3) _Depends:_ T-b5
- [x] **T-b7** Write + pass backup tests: `.bak-<timestamp>` on change; **no**
  backup when nothing changes. (R4.3, R6) _Depends:_ T-b5
- [x] **T-b8** Add shebang `#!/usr/bin/env bun` and `main()`-returns-exit-code
  wrapper so the engine runs standalone and in-process for tests. (Design §3)
  _Depends:_ T-b5

## (c) Compile knob + hooks (soft / hardened)

- [ ] **T-c1** Write `plugins/.../hooks/hooks.json`: SessionStart nudge invoking
  the engine in **soft** mode (`bun run "${CLAUDE_PLUGIN_ROOT}/scripts/harness-setup.ts" check`),
  non-blocking, prints nudge on exit `3`, nothing on `0`. (R8, R10.1)
  _Depends:_ T-b8
- [ ] **T-c2** Write `scripts/build-hardened.ts`: `bun build --compile --outfile
  dist/harness-setup` (document `--target bun-<os>-<arch>` for cross builds);
  wire `build:hardened` script. (ADR-0003, R10.2) _Depends:_ T-b8
- [ ] **T-c3 (opt)** Write `scripts/set-mode.ts`: flip hook/command invocation
  strings between soft and hardened. (ADR-0003) _Depends:_ T-c1, T-c2
- [ ] **T-c4** Verify hardened path: build the binary, run `check`/`apply`
  against an isolated HOME, confirm identical behaviour/exit codes to soft.
  (R10.3) _Depends:_ T-c2

## (d) Generic reference data

- [x] **T-d1** Write generic `plugins/.../reference/deny.json` (secrets/keys/
  credentials read-blocks), source of truth, no internal rules. (R4.1)
  _Depends:_ T-a4
- [x] **T-d2** Write generic English `plugins/.../reference/CONTEXT.md`: example
  team context, deny ≠ context note; remove all "internal marketplace /
  security-IT validation" wording. (R11.3, de-internalisation map)
  _Depends:_ T-a4

## (e) Command + skill (English, confirm-before-write)

- [ ] **T-e1** Write `plugins/.../commands/harness-setup.md` (EN): locate engine
  with `${CLAUDE_PLUGIN_ROOT}` + **filesystem fallback** (markdown no-expand
  trap), run `check`, present gaps, confirm, `apply`, summary. (R9, Design §6)
  _Depends:_ T-b8, T-d1, T-d2
- [ ] **T-e2** Write `plugins/.../skills/harness-setup/SKILL.md` (EN): trigger on
  setup/configure/verify/audit intents; same confirm-before-write flow. (R9.5)
  _Depends:_ T-e1

## (f) Tests pass on `bun test`

- [ ] **T-f1** Ensure all engine tests (b2/b4/b6/b7) run green under `bun test`
  from repo root; fix any path/isolation issues. (R13) _Depends:_ T-b6, T-b7

## (g) Docker demo + devcontainer

- [ ] **T-g1** Write `docker/Dockerfile`: Bun base image, copy repo, isolated
  HOME (or `HARNESS_HOME`), entrypoint runs `check`/`apply` demo without touching
  the real `~/.claude`. (R12.1) _Depends:_ T-b8, T-d1, T-d2
- [ ] **T-g2** Write `.devcontainer/devcontainer.json` as a thin wrapper over
  `docker/Dockerfile` (no duplicated build). (R12.2) _Depends:_ T-g1
- [ ] **T-g3** Build the image and run the demo; document the result; note the
  Claude Code CLI dependency is conditional. (R12.3) _Depends:_ T-g1

## (h) CI

- [ ] **T-h1** Write `.github/workflows/ci.yml`: on push/PR → set up Bun → oxlint
  + dprint check + `bun test`; fail on any failure. (R14) _Depends:_ T-f1

## (i) README (OSS, English)

- [ ] **T-i1** Write `README.md` (EN): what/why, three layers, install for
  **public GitHub** (`org/repo`) and **generic private HTTPS** (full git URL +
  credential helper), soft vs hardened with the honesty caveat, Docker demo,
  `bun test`. No internal references. (R10.4, R11, R12, ADR-0004)
  _Depends:_ T-e1, T-c2, T-g1, T-d1
- [ ] **T-i2** Do NOT ship `BRIEF.md`; run a de-internalisation grep gate over the
  whole repo (no internal git host / host-CLI / in-house CA / security-IT org /
  specific model backend / MDM); fix any hit. (R11.3, Design §10)
  _Depends:_ T-i1

## (j) Optional extras

- [ ] **T-j1 (opt)** `examples/clone-and-go/.claude/settings.json`: minimal repo
  skeleton showing `extraKnownMarketplaces` onboarding. _Depends:_ T-a6, T-i1
- [ ] **T-j2 (opt)** `PRESENTATION.md`: talk track — three layers, deny ≠ context,
  native scope merge (concat+dedup), `${CLAUDE_PLUGIN_ROOT}` trap, clone & go,
  soft vs hardened with the honesty caveat. _Depends:_ T-i1

---

## Suggested ordering / parallelism

1. **Foundation:** T-a1 → T-a2/T-a3/T-a6 (parallel) → T-a4 → T-a5.
2. **Engine (critical path):** T-b1 → T-b2 → T-b3 → T-b4 → T-b5 → (T-b6, T-b7,
   T-b8 parallel).
3. **Reference data** (T-d1, T-d2) can proceed in parallel with the engine once
   T-a4 lands.
4. **Tooling around the engine:** T-c1/T-c2 (parallel) → T-c4; T-e1 → T-e2.
5. **Wrap-up:** T-f1 → T-h1; T-g1 → T-g2/T-g3; T-i1 → T-i2.
6. **Optional:** T-c3, T-j1, T-j2 last.

Gate before "done": all non-opt boxes checked, `bun test` green in CI, and the
de-internalisation grep gate (T-i2) clean.
