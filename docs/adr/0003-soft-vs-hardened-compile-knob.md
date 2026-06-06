# ADR-0003: Soft vs hardened distribution of the engine (a compile knob)

**Date**: 2026-06-06
**Status**: Accepted
**Deciders**: Tech Lead, PM

## Context

The engine (`harness-setup.ts`, ADR-0002) is the deterministic program that
performs the out-of-plugin writes. There are two competing distribution wishes:
keep it readable and editable so a learner can study and adapt it, *and* harden
it against accidental or trivial edits in a more controlled rollout.

### Problem

How should the engine be distributed and invoked? One mode cannot satisfy both
wishes, so we need a deliberate, documented switch — and we must be honest about
what hardening does and does not buy.

### Constraints

- The example must teach both stances, not pick one silently.
- Whatever we ship must not mis-state its security properties (see the honesty
  rule in the brief).
- The hook invocation must adapt to whichever mode is active.

## Options Considered

### Option A: Soft only — ship the `.ts` source

Hooks run `bun run <script>`.

**Pros**: Maximally readable/editable; nothing to build; ideal for learning.
**Cons**: Trivially editable; doesn't illustrate the hardening conversation.
**Effort**: Low

### Option B: Hardened only — ship a compiled binary

`bun build --compile --outfile` → standalone binary; hooks run the binary.

**Pros**: Resists casual edits; one self-contained artifact; runs without Bun
installed (binary embeds the runtime).
**Cons**: Opaque to a learner; needs a build step and per-target builds; could be
mistaken for real enforcement.
**Effort**: Medium

### Option C: A knob exposing both modes

Ship the source by default (soft). Provide a build that produces the binary
(hardened). Hooks point at the source or the binary depending on the active mode.

**Pros**: Teaches both stances explicitly; the reader sees the trade-off rather
than a single opinion.
**Cons**: Two invocation paths to keep correct and tested.
**Effort**: Medium

## Decision

We adopt **Option C: a compile knob exposing both `soft` and `hardened` modes.**

- **soft** (default): ship `harness-setup.ts`; hooks run `bun run` against it.
- **hardened**: a build step runs `bun build --compile --outfile` to produce a
  standalone binary; hooks run the binary.
- Cross-target binaries are produced with `--target bun-<os>-<arch>` when needed.

### Rationale

The value of this repo is pedagogical. Showing *both* distribution stances, and
the seam between them, is more instructive than asserting one. The knob makes the
trade-off the lesson.

### Honesty caveat (load-bearing — must appear in shipped docs)

**Hardened is not enforcement.** Compiling the engine only hardens the **tooling**
layer against accidental or trivial editing. It is *not* tamper-proof and must
never be described as "unmodifiable":

- Real enforcement is the **deny list** in `settings.json`.
- Only the **managed** scope is genuinely non-bypassable by the developer.
- A determined user on their own machine can replace the binary, the hook, or the
  settings. The compile knob does not change that.

Promotion to managed enforcement is explicitly **out of scope** for Phase 1
(future work).

## Consequences

### Positive

- The example teaches enforcement vs tooling vs context concretely.
- Soft mode keeps the engine hackable; hardened mode shows the durable-tooling
  pattern.

### Negative

- Two invocation paths (source vs binary) must both be tested and documented.
- Per-platform binaries if hardened mode is distributed broadly.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Readers read "compiled" as "secure/enforced" | Medium | High | The honesty caveat is repeated in README and design.md; "tamper-proof" is never used |
| Hardened binary built for the wrong platform | Medium | Low | Document `--target`; default demo path is soft mode |
| Two code paths drift | Low | Medium | Hook-resolution logic is shared/tested for both modes |

## References

- CONTEXT.md — *Soft vs hardened*, *Engine*, *The three layers*
- ADR-0002 (Bun runtime)
- Bun docs: single-file executables (`--compile`, `--target`)
