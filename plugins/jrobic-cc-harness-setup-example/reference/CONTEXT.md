# Team Context — Example Harness

> **Managed file.** Do not edit by hand — this file is overwritten on every
> `apply` run. To update the team context, edit
> `plugins/jrobic-cc-harness-setup-example/reference/CONTEXT.md` in the
> harness repository, then run `/harness-setup` to apply the change.

---

## Important: deny ≠ context

The **deny list** (in `~/.claude/settings.json → permissions.deny`) is the
enforcement layer. It blocks the agent from reading secrets, credentials, and
private keys — it cannot be talked around.

**This file** is the context layer. It is advisory guidance that the agent
reads and reasons about, but can be overridden by subsequent instructions.
Never put hard prohibitions here: they belong in the deny list.

---

## Conventions

- **Secrets and credentials** are blocked at the deny layer.
  If a rule causes a false positive that hinders legitimate work, report it so
  the reference deny list can be adjusted. Do not remove rules locally.
- **Shared tooling** (commands, skills, hooks, MCP servers) is provided by this
  plugin. You do not need to duplicate these in your personal configuration.
- **To audit your setup** at any time, run `/harness-setup`. It runs `check`
  first and only writes with your explicit confirmation.

## Project-specific guidance (example — replace with your team's conventions)

- Follow the coding standards in `CONTRIBUTING.md` when present.
- Prefer incremental commits; describe the "why" in commit messages, not the
  "what" (the diff shows the what).
- Flag security-sensitive changes in the PR description so reviewers know to
  apply extra scrutiny.

---

*This is a generic example context. Replace this content with your team's
actual conventions before deploying the harness in a real project.*
