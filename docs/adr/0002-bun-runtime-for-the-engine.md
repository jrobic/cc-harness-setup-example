# ADR-0002: Bun is the runtime for the engine

**Date**: 2026-06-06
**Status**: Accepted
**Deciders**: Tech Lead, PM

## Context

The harness performs two out-of-plugin writes (deny merge, context import) that
the plugin format cannot express. A small deterministic **engine** does this. The
source POC implemented it as a zero-dependency Node ESM script
(`harness-setup.mjs`).

### Problem

Pick the runtime for the engine. The choice drives: how hooks invoke it, how
tests run, and whether a single-file compiled distribution is available (see
ADR-0003).

### Constraints

- The engine must stay dependency-free and deterministic.
- We want a first-class test runner without adding a test framework dependency.
- We want the _option_ to ship a standalone compiled binary (ADR-0003).
- This is an example repo; the toolchain should be one install, not several.

## Options Considered

### Option A: Node.js (keep `.mjs`, add Vitest)

**Pros**:

- Ubiquitous; the POC already runs on it.

**Cons**:

- Needs a separate test framework (Vitest) and its dependency tree.
- No first-party single-file `--compile` path for the hardened mode (ADR-0003);
  would require `pkg`/SEA gymnastics.

**Effort**: Medium

### Option B: Bun

**Pros**:

- Runs TypeScript directly — engine becomes `harness-setup.ts`, no build step in
  soft mode.
- Built-in test runner (`bun test`) — no test framework dependency.
- First-party `bun build --compile --outfile` produces a standalone binary for
  the hardened mode (ADR-0003), including cross-target builds.
- Single toolchain to install for a reader following along.

**Cons**:

- Bun must be installed on the developer's machine for soft mode (hooks run
  `bun run`). Mitigated by the Docker demo and by documenting the install.
- Smaller ecosystem than Node — irrelevant here since the engine is
  dependency-free.

**Effort**: Low

## Decision

We adopt **Option B: Bun**.

- Engine: `harness-setup.ts`, executed by Bun.
- Tests: `bun test`.
- Soft-mode hooks invoke `bun run <script>`; hardened mode invokes the compiled
  binary (ADR-0003).
- Shebang `#!/usr/bin/env bun` on the engine for direct execution.

### Rationale

Bun collapses three concerns into one toolchain: TypeScript execution without a
build step, a built-in test runner, and a first-party single-file compiler. For a
zero-dependency engine that we also want to optionally compile, this is the
lowest-friction choice. The cost — Bun must be present at runtime in soft mode —
is bounded by the Docker demo and clear install docs.

## Consequences

### Positive

- No build step in soft mode; no test framework dependency.
- A clean path to the hardened binary (ADR-0003) with the same toolchain.

### Negative

- Soft mode requires Bun on the host. Documented; the Docker demo sidesteps it.

### Risks

| Risk                                                      | Likelihood | Impact | Mitigation                                                                            |
| --------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------- |
| Reader's machine lacks Bun, soft-mode hook fails silently | Medium     | Low    | Hook degrades to a nudge; README lists Bun as a prerequisite; Docker demo provides it |
| Bun API drift across versions                             | Low        | Low    | Engine uses only stable `node:fs`/`node:os`/`node:path` APIs Bun implements           |

## References

- CONTEXT.md — _Engine_, _Soft vs hardened_
- ADR-0003 (soft vs hardened compile knob)
- Bun docs: `bun build --compile`, `bun test`

## Update (2026-06-17) — Docker demo removed

The Docker demo / devcontainer referenced above as a Bun-prerequisite mitigation
was removed (the local-alias demo in `docs/demo-setup.md` covers the demo need).
The Bun-prerequisite mitigation is now: README lists Bun as a prerequisite, and
`docs/demo-setup.md` documents `bun install`.
