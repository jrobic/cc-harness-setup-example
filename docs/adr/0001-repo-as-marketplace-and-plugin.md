# ADR-0001: The repository is both the marketplace and the plugin host

**Date**: 2026-06-06
**Status**: Accepted
**Deciders**: Tech Lead, PM

## Context

This project is an open-source _example_ showing how to onboard a developer onto
a recommended Claude Code configuration in one command. It ships a marketplace, a
plugin, and the supporting docs.

### Problem

A marketplace and the plugins it advertises can be laid out in several ways. We
must pick a layout that is the easiest to clone, read, and reason about for a
newcomer, since pedagogy is the product here.

### Constraints

- Single public GitHub repository is the unit of distribution.
- A newcomer should be able to `git clone` and immediately see the whole picture.
- The example must stay minimal (one plugin) — see scope in the brief.

## Options Considered

### Option A: Repo is the marketplace; the plugin lives inside it

`.claude-plugin/marketplace.json` at the repo root advertises one plugin under
`plugins/<plugin>/`.

**Pros**:

- One repo, one clone, everything visible.
- Matches the source POC layout; minimal moving parts.
- `extraKnownMarketplaces` can point at this same repo for clone & go.

**Cons**:

- Marketplace and plugin versioning are coupled (acceptable for an example).

**Effort**: Low

### Option B: Separate marketplace repo + separate plugin repo(s)

**Pros**:

- Independent versioning; closer to a large real-world org setup.

**Cons**:

- Two repos to clone and cross-reference; more ceremony than an example needs.
- Harder to demonstrate clone & go from a single entry point.

**Effort**: Medium

## Decision

We adopt **Option A**: the repository _is_ the marketplace and hosts the plugin
inside it.

- Repository name: `cc-harness-setup-example`.
- Plugin name: `jrobic-cc-harness-setup-example`.
- Marketplace manifest at `.claude-plugin/marketplace.json`, plugin under
  `plugins/jrobic-cc-harness-setup-example/`.

### Rationale

The deliverable is a teaching example. A single clonable repo where the
marketplace, the plugin, the engine, and the docs all sit together is the
clearest possible artifact. Independent versioning (Option B) buys nothing for an
example and costs navigability.

## Consequences

### Positive

- One clone shows the complete three-layer harness.
- `extraKnownMarketplaces` in this repo's checked-in settings enables clone & go
  against the very repo being read.

### Negative

- The plugin cannot be versioned independently of the marketplace. Acceptable:
  this is an example, not a fleet of plugins.

### Risks

| Risk                                                          | Likelihood | Impact | Mitigation                                                                              |
| ------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------- |
| Readers copy the coupled layout into a large multi-plugin org | Medium     | Low    | README states this layout is an _example_ and points at the split-repo option for scale |

## References

- CONTEXT.md — _Marketplace_, _Plugin_, _Clone & go_
- ADR-0002 (Bun runtime), ADR-0004 (public/private install)
