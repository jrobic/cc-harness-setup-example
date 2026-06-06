# CONTEXT — Domain glossary

This file defines the shared vocabulary used across the specs, ADRs, and code of
this repository. Terms are defined once here; other documents reference them
instead of re-defining them. The language is deliberately tool-agnostic where it
can be, and pins down the Claude Code specifics only where they matter.

---

## Harness

The set of recommended configuration, tooling, and context an organisation wants
its developers to run with an AI coding agent. A harness is **not** a single
file: it spans three distinct layers (below). This repository ships a minimal,
generic example of such a harness so a newcomer can adopt it with one command.

## The three layers

These three layers are the backbone of the whole design. They are kept separate
on purpose because they have different trust properties.

- **Enforcement** — hard constraints the agent cannot talk its way around.
  Expressed as a **deny list** (and, more strictly, as managed settings). Lives
  in `settings.json`, not in prose.
- **Tooling** — the portable, "pluginnable" capabilities: commands, skills,
  agents, hooks, MCP servers. Distributed as a **plugin** through a
  **marketplace**.
- **Context** — guidance and conventions for the agent. Advisory, overridable.
  Lives in `CLAUDE.md` (and equivalents). It is _not_ enforcement.

> Key invariant: **deny ≠ context.** A hard prohibition belongs in the deny list
> (or a `PreToolUse` hook), never in `CLAUDE.md`. `CLAUDE.md` is guidance the
> agent can be argued out of.

## Marketplace

A git repository that advertises one or more installable plugins via a
`.claude-plugin/marketplace.json` manifest. A developer registers a marketplace,
then installs plugins from it.

## Plugin

A distributable bundle of agent tooling: commands, skills, agents, hooks, and MCP
server declarations (`.mcp.json`). Declared by a `.claude-plugin/plugin.json`
manifest. A plugin **cannot** ship a deny list or context import directly — those
are not plugin components (see _Out-of-plugin writes_).

## Deny list

An array of rules that block the agent from performing certain actions (e.g.
reading secret files). It is a **scope-distributed array**, not a plugin
component. When the agent merges multiple scopes, array-valued permission fields
are **concatenated and de-duplicated** rather than overwritten.

## Scope & precedence

Configuration is layered across scopes. Scalar values are resolved by precedence
(a higher scope overrides a lower one); array values (deny/allow lists) are
merged across scopes. Precedence, highest to lowest:

`Managed > CLI > Local > Project > User`

Only the **managed** scope is non-bypassable by the developer. Everything below
it is, ultimately, opt-in and editable by whoever owns the machine.

## Out-of-plugin writes

The two writes a plugin format cannot express, which this example performs
explicitly with the developer's consent:

1. **Deny merge** — merge the reference deny rules into the user's
   `settings.json` (`permissions.deny`), concat + dedup, touching nothing else.
2. **Context import** — ensure an import line (e.g.
   `@~/.claude/harness/CONTEXT.md`) exists in the user's `CLAUDE.md`, inside
   managed markers so it is never duplicated.

## Idempotence

Running the engine's `apply` twice produces the same end state as running it
once: no duplicate deny rules, exactly one import block, context file refreshed
in place. `check` after a successful `apply` reports a complete configuration.

## Backup

Before any write, the engine copies the target file to `<file>.bak-<timestamp>`
so the previous state is always recoverable.

## Human-in-the-loop

The agent never writes without explicit confirmation. The flow is always
**check → present diff → confirm → apply**. Adoption is opt-in at every step
(trusting the folder, installing the plugin, confirming the write).

## Soft vs hardened

Two distribution modes for the engine, selected by a build knob:

- **soft** — the engine ships as readable, editable TypeScript source; hooks run
  it via the runtime (`bun run <script>`).
- **hardened** — the engine is compiled to a standalone binary and shipped as
  such; hooks run the binary.

> Honesty caveat: _hardened is not enforcement._ A compiled binary only hardens
> the **tooling** against accidental or trivial edits. Real enforcement is the
> deny list in `settings.json`, and only the **managed** scope is truly
> non-bypassable. "Compiled" must never be sold as "tamper-proof".

## Engine

The deterministic, dependency-free program that performs the out-of-plugin
writes. It exposes two subcommands — `check` and `apply` — communicates result
through exit codes, and resolves the target home directory from the environment
so it can be pointed at an isolated home for demos and tests.

## Clone & go

The onboarding path where a reference repository declares the marketplace in its
checked-in settings (`extraKnownMarketplaces`). On trusting the folder, the
developer is prompted to install the marketplace and plugin — no manual
registration step.
