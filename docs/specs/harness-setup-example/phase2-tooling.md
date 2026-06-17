# Phase 2 — DevOps tooling survey & verdict

**Status:** decision survey (input to future ADRs + Phase 2 backlog).
**Date:** 2026-06-16 (session 5).
**Scope:** for each DevOps tool, decide **Skill | MCP | Hook**, and define the
guardrail layer that turns the harness from "CLI wrappers" into a product.

Extends the earlier tooling split decision (2026-06-16: Datadog → MCP; GitLab &
AWS → CLI-wrapping skills) into a full survey.

---

## Decision rule — Skill | MCP | Hook

| Layer                          | When                                                                                                                                                         | Cost / trait                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Skill (wrap CLI)** — DEFAULT | A mature CLI already covers the ground and its auth is already configured                                                                                    | Zero idle token cost, deterministic, reuses existing creds |
| **MCP** — exception            | No local CLI, OR structured server-side data, OR OAuth-at-runtime, OR a capability the CLI can't give (live queries, structured findings the model consumes) | Costs tokens (tool schemas loaded). Use sparingly          |
| **Hook** — enforcement         | A check must run deterministically around tool calls (guardrails), not at the model's discretion                                                             | Runs outside model control; the real differentiator        |

---

## Two baselines — public skeleton vs private team fork

We ship **two** harnesses from one codebase. The current repo is the public one;
the team will **fork** it privately and layer its real pieces on top.

| Baseline               | What it is                                   | Contents                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public** (this repo) | Generic OSS skeleton — teaches the _pattern_ | Engine, generic `deny.json`, command/skill, example MCP, **generic guardrail hooks** (secret-leak, deny-runtime), Datadog MCP _declaration_ (unconfigured)                                                                |
| **Private team fork**  | The real harness the team installs           | Everything public **+** real deny rules / CONTEXT.md, **team infra skills** (glab/aws/az/terraform/docker), **second brain** (qmd/graphify/claude-mem), efficiency (caveman/rtk), configured MCPs (real Datadog endpoint) |

The fork **inherits** the public baseline. So qmd/caveman/rtk/graphify are **not**
out of scope — they are **private-fork baseline**, tied to the future second
brain. Each tool below carries a **Baseline** tag (Public / Private fork).

---

## DevOps tools — verdict

| Tool                           | Mechanism                             | Baseline     | Rationale                                                                              |
| ------------------------------ | ------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| **glab** (GitLab CLI)          | Skill                                 | Private fork | Decided. Mature CLI, auth present. MRs / pipelines / issues.                           |
| **aws**                        | Skill (scoped, read-first)            | Private fork | Decided. Huge surface, least-privilege. AWS Labs MCP optional (docs, cost).            |
| **az** (Azure CLI)             | Skill                                 | Private fork | Same logic as aws.                                                                     |
| **terraform**                  | Skill (plan/validate/fmt/state) + MCP | Private fork | CLI for ops; **HashiCorp Terraform MCP** (official) for registry/module lookup.        |
| **terraform-docs / helm-docs** | Skill                                 | Private fork | Deterministic generators. No reason for MCP.                                           |
| **docker**                     | Skill (build/run/compose)             | Private fork | Mature CLI. Lint via hadolint/dive (see guardrails).                                   |
| **semgrep**                    | Skill default, MCP if agent-driven    | Public       | Generic security scan; **semgrep MCP** for structured findings in a loop.              |
| **ast-grep**                   | Skill                                 | Public       | Structural search/rewrite, codemods. Replaces Grep for transforms.                     |
| **Trivy**                      | Skill + Hook                          | Public       | **Security pivot**: images/fs/IaC/secrets/SBOM. Wire as a gate.                        |
| **Checkov**                    | Skill / Hook gate                     | Private fork | IaC scan. Better as a hook than a discretionary skill.                                 |
| **tfsec**                      | ⚠️ DO NOT                              | —            | **Deprecated → folded into Trivy** (Aqua). _(High confidence, verify before relying.)_ |
| **datadog**                    | MCP                                   | Private fork | Decided. Official, HTTP/OAuth-runtime, needs the real endpoint.                        |

> ⚠️ MCP existence (semgrep, HashiCorp TF, AWS Labs, GitLab Duo) is true as of the
> knowledge cutoff (Jan 2026) but **the ecosystem moves fast — verify the package
> name and transport before adopting.**

---

## Guardrails = the end-goal (hooks)

This is where the security tools become the harness **product**, not just
wrappers. Closes the loop from static `deny.json` to runtime enforcement.

### PreToolUse (blocking)

- **secret-leak** — `gitleaks` / `trufflehog` on Write/Edit + `git push` (staged)
  → block on match. ← the flagship guardrail (the stated end-goal).
- **deny runtime** — apply `deny.json` as a hook → block denied Bash commands.
  (static → runtime).
- **destructive gate** — confirm on `terraform apply`, `kubectl delete`,
  `docker system prune`, `aws ... delete`.
- **IaC gate** — Trivy/Checkov on `*.tf` before commit/apply → block HIGH/CRITICAL.
- **policy gate** — `conftest` / OPA (rego) = policy-as-code.

### PostToolUse (auto-fix / lint)

- `terraform fmt` + `tflint` after editing `*.tf`.
- `hadolint` after editing a Dockerfile.
- `shellcheck` after editing `*.sh`.

### Tools that feed the guardrails

gitleaks/trufflehog, Trivy, Checkov, conftest/OPA, tflint, hadolint, shellcheck,
cosign (image signing / supply-chain), syft + grype (SBOM + vuln), **Meta Prompt
Guard 2 / LLM Guard / Rebuff / Vigil** (prompt-injection detection), **Lakera
Guard** (commercial, private-fork only — sends content to an external API).

### Prompt-injection scan (untrusted content)

Injection arrives via **tool output**, not the user prompt: WebFetch pages, Read
of untrusted files, MCP responses, PR/issue text, dependency READMEs. Layered
mitigation:

- **Containment (the real defense)** — least-privilege deny list + the action
  gates above (secret-leak on write/push, destructive-gate). Even a successful
  injection can't exfiltrate or destroy without hitting a gate; this neutralises
  most payloads regardless of detection.
- **Detection (added layer, best-effort)** — a hook on untrusted-content
  surfaces (PostToolUse on Read/WebFetch/MCP; UserPromptSubmit for the prompt)
  flags injection signatures and marks the content as data, not instructions.
  - Default: **embedded heuristics** (zero-dep) — "ignore previous
    instructions", hidden Unicode tag chars, tool-directive-in-data, suspicious
    base64. Mirrors the secret-leak regex approach.
  - Optional escalation: **Meta Prompt Guard 2** (open-weight classifier,
    ~22–86M, local) if installed — the "gitleaks-equivalent" upgrade.

Honest caveat: detection is probabilistic and bypassable by novel phrasing. It
**complements**, never replaces, least-privilege + the gates.

### Lot 1 — decided build order (2026-06-17, user)

Public baseline, first build batch — **five behaviours across four hook scripts**:

1. **deny-runtime + destructive-gate** (P0) — one PreToolUse/Bash script, 2 tiers
   (`deny` / `ask`). Foundation. _(merged — see architecture note in PROGRESS.)_
2. **secret-leak** (P0) — PreToolUse Write/Edit + pre-push; embedded regex +
   gitleaks if present. The stated end-goal.
3. **injection-scan** (P1) — hook on untrusted content (PostToolUse Read/WebFetch
   - UserPromptSubmit); embedded heuristics + optional Prompt Guard 2. Layered
     with the gates above, not a replacement.
4. **linters auto** (P1) — PostToolUse: hadolint / shellcheck / actionlint;
   graceful skip if a binary is absent. Quick win, self-applies to this repo.

Deferred to private fork / later: IaC gate (Trivy/Checkov, P2), policy gate
(conftest/OPA, P3). All Lot 1 = `feat:` commits → the first triggers **v0.2.0**.

---

## Second brain & efficiency layer — private-fork baseline

Not personal throwaways: these form the team's **second brain** (knowledge
capture + retrieval + structure) plus the **token efficiency** that makes
querying it affordable at scale. They join the **private-fork baseline** (not the
public skeleton), because they are tied to the future second brain.

| Tool           | Mechanism        | Role in the second brain                                                                                                                       |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **qmd**        | MCP              | **Retrieval** — local BM25 (+ future vector) search over the team wiki / markdown corpus.                                                      |
| **graphify**   | Skill            | **Structure** — turns any input (code / docs / papers) into a persistent knowledge graph (god nodes, community detection, query/path/explain). |
| **claude-mem** | MCP / plugin     | **Memory** — cross-session observation capture + recall. The capture leg of the brain (already active in the user's setup).                    |
| **caveman**    | Skill / plugin   | **Efficiency** — ~75% token compression on comms, so large-context brain queries stay affordable.                                              |
| **rtk**        | Hook (CLI proxy) | **Efficiency** — 60–90% token savings on dev-op command output.                                                                                |

Second brain = **qmd (search) + graphify (graph) + claude-mem (memory)**;
**caveman + rtk** keep it cheap to operate. All private-fork baseline.

---

## Additional proposed tools

| Tool                                           | Mechanism                     | Baseline                                         | Note                                                                             |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| **gitleaks / trufflehog**                      | Hook + Skill                  | Public                                           | Secret detection — core of the secret-leak guardrail                             |
| **Prompt Guard 2 (Meta) / LLM Guard / Lakera** | Hook (+ optional model / API) | Public (heuristics) · Private fork (model / API) | Prompt-injection detection; layered with the containment gates, never standalone |
| **gh** (GitHub CLI)                            | Skill                         | Private fork                                     | If GitHub sits alongside GitLab                                                  |
| **kubectl + helm + kustomize**                 | Skill                         | Private fork                                     | k8s ops; mature CLI beats the k8s MCP                                            |
| **vault** (HashiCorp)                          | Skill                         | Private fork                                     | Secrets; scoped, cautious                                                        |
| **sops / age**                                 | Skill + Hook                  | Private fork                                     | Repo secret encryption                                                           |
| **conftest / OPA**                             | Hook                          | Public                                           | Policy-as-code gate                                                              |
| **actionlint**                                 | Hook                          | Public                                           | Lint GitHub Actions (repo has `.github/workflows/`)                              |
| **hadolint**                                   | Hook                          | Public                                           | Lint Dockerfile (repo has `docker/Dockerfile`)                                   |
| **shellcheck**                                 | Hook                          | Public                                           | Lint shell (hooks / scripts)                                                     |
| **cosign / syft / grype**                      | Skill + Hook                  | Private fork                                     | Supply-chain: signing, SBOM, vuln                                                |
| **k9s**                                        | — (human TUI)                 | Private fork                                     | Not for the agent                                                                |

---

## Honest take & recommended first build

This survey far exceeds the current backlog (just `skills/gitlab` +
`skills/aws`). The **public** repo's real differentiator is the generic
**guardrail hooks layer** (secret-leak, deny-runtime), not CLI wrappers — those
are team-specific and live in the **private fork**, alongside the second brain.

**Recommended first build (public baseline):** secret-leak hook + deny-runtime
hook — the stated end-goal and the most demo-able piece. Trivy/Checkov IaC gate
next. Infra skills + second brain land in the private fork.

**Possible follow-ups — two ADRs:**

- `docs/adr/0005-skill-vs-mcp-vs-hook.md` — the Skill | MCP | Hook decision rule.
- `docs/adr/0006-public-skeleton-vs-private-fork.md` — the two-baseline model and
  what the fork inherits vs adds (second brain, infra tooling).
