# ADR-0004: Generic install paths — public GitHub and private git, no internal references

**Date**: 2026-06-06
**Status**: Accepted
**Deciders**: Tech Lead, PM

## Context

This repository is derived from an internal proof of concept. The POC documented
installation against a specific internal git host, with host-specific auth tooling,
a private certificate authority, and a particular model backend. None of that may
ship in a public OSS example.

### Problem

Document how a developer registers the marketplace and installs the plugin, in a
way that is (a) correct for a public GitHub repo, (b) correct for a generic
private git host, and (c) free of any organisation-specific reference.

### Constraints

- No internal references whatsoever: no internal git host, no host-specific CLI,
  no in-house CA, no security/IT org names, no specific model backend, no MDM.
- Must work for the public GitHub case (the repo's own home).
- Must also show the generic private-git case, since real adopters often host
  privately.

## Options Considered

### Option A: Public GitHub only

**Pros**: Simplest; uses the `org/repo` shorthand.
**Cons**: Ignores private adopters; teaches half the story.
**Effort**: Low

### Option B: Public GitHub + generic private git (HTTPS), both documented generically

**Pros**: Covers both audiences; stays vendor-neutral; teaches the auth seam
without naming any specific host.
**Cons**: Slightly more documentation surface.
**Effort**: Low

## Decision

We adopt **Option B**, documenting both paths in generic terms:

- **Public GitHub**: register via the `org/repo` shorthand
  (`claude plugin marketplace add <org>/<repo>`).
- **Generic private git (HTTPS)**: register via the full HTTPS git URL
  (`claude plugin marketplace add https://<git-host>/<group>/<repo>.git`), relying
  on the developer's existing git credential helper for auth.

The following are **cut entirely** and must not appear anywhere in the repo: any
named internal git host or internal-CLI auth tool, any in-house certificate
authority, any security/IT organisation, any specific model backend, and any MDM
/ managed-enforcement rollout (the last is deferred to a future phase).

### Rationale

A public example must be usable by anyone and must not leak the provenance of the
internal POC. Covering both the GitHub shorthand and the generic private-HTTPS
path teaches the real distinction (shorthand is GitHub-only; everything else uses
a full git URL + the standard credential helper) without naming any vendor.

## Consequences

### Positive

- The repo is publishable as-is, with no internal leakage.
- Readers learn the public and private install seams in vendor-neutral terms.

### Negative

- Private-host specifics (CA trust, token-in-env for silent auto-update) are only
  mentioned generically; deep private-CI hardening is left to the adopter.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An internal reference slips through de-internalisation | Medium | High | A dedicated de-internalisation task with a grep-based check in tasks.md; review gate before publish |
| Readers expect turnkey private-CI auth | Low | Low | README states private auth/CA/token specifics are environment-dependent and out of scope for the example |

## References

- CONTEXT.md — *Marketplace*, *Clone & go*
- ADR-0001 (repo-as-marketplace)
- Brief: de-internalisation file-by-file map
