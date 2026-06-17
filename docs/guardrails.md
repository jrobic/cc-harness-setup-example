# Guardrail hooks — what they do, what they protect

> 🇫🇷 Version française : [`guardrails.fr.md`](./guardrails.fr.md)

The harness ships four **guardrail hooks** that run automatically while the
plugin is enabled — no `/harness-setup` needed for these (that command configures
the _static_ deny list; the hooks are the _active_ layer). They sit between the
agent and your machine and intervene **before** a risky tool call runs.

**Posture: defense in depth, not a sandbox.** These hooks stop an agent that
hallucinates a dangerous command, an obvious prompt-injection, a stray secret, or
a human slip. A determined adversary who can already run arbitrary shell will
bypass string-matching hooks — see [Known limits](#known-limits) and the full
[`THREAT_MODEL.md`](./THREAT_MODEL.md).

## The four guards

| Guard                    | Fires on                                 | What it does                                                                                                                  | Protects against                                                                                                   |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **`guard-command`**      | Bash commands                            | **Blocks** destructive / exfiltration / escalation commands; **asks** you to confirm history-rewriting or destructive git ops | `rm -rf /`, disk wipes, fork bombs, `curl … \| bash`, file uploads, `sudo`, setuid, `git push --force`, …          |
| **`guard-secret`**       | Read / Edit / Write / Grep / Glob / Bash | **Blocks** access to secret-bearing files & directories (symlinks resolved)                                                   | reading `.env`, SSH/PGP keys, `~/.aws/credentials`, `.npmrc` tokens, Terraform state, `secrets/`, …                |
| **`guard-write-secret`** | Write / Edit / MultiEdit                 | **Blocks** writing a hardcoded secret **value** into a file                                                                   | baking an AWS key, GitHub PAT, Slack token, private key, JWT… into source                                          |
| **`guard-prompt`**       | Every prompt you submit                  | **Warns** the model to treat embedded directives as untrusted data                                                            | prompt-injection in pasted web pages / issues / docs ("ignore previous instructions", injected `<system>` tags, …) |

## How each behaves

Three intervention levels, mapped to Claude Code's hook decisions:

- **Block (`deny`)** — the tool call is refused outright, with the reason shown
  to the model. Used by `guard-command` (dangerous commands), `guard-secret`, and
  `guard-write-secret`.
- **Ask (`ask`)** — Claude Code surfaces a confirmation prompt; you approve or
  reject. Used by `guard-command` for git operations that can rewrite history or
  mutate a remote. It works **by inversion**: a small allowlist of safe git
  subcommands (`status`, `diff`, `log`, `add`, `commit`, `fetch`, …) passes
  silently; **everything else** asks — so a new/unknown git subcommand defaults to
  asking, no code change needed.
- **Warn (context)** — nothing is blocked; the hook injects a note telling the
  model the submitted text matches injection signatures and should be treated as
  data. Used by `guard-prompt` (blocking your own prompts would be too noisy).

Every hook **fails open**: on an empty or malformed input it allows the call
rather than breaking your session. Denials are logged (mode `0600`, rotated at
5 MB) next to each hook script.

## Two layers, one harness

| Layer       | Set up by                                                       | What                                                                                                                          |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Static**  | `/harness-setup` writes `permissions.deny` into `settings.json` | Native deny globs for secret-file reads — present even if the hooks are off. The minimal floor.                               |
| **Dynamic** | The plugin's hooks (this page)                                  | Command-content analysis, richer secret matching, write-side detection, injection warnings. Catches what globs can't express. |

They overlap on purpose: a secret-file read is caught by both. Static is the
floor; the hooks are the active, content-aware layer.

## Known limits

Honest, by construction (each is covered by a `known limits` test so any change
is intentional):

- **Shell obfuscation** defeats the Bash matchers: `rm -rf "/"`, `D=/; rm -rf $D`,
  `rm -rf $(echo /)`, hex/base64-encoded paths, heredocs, native interpreters
  (`python -c "open('/etc/passwd')"`).
- **Write-side secret detection is regex-only** — novel/obfuscated encodings slip
  through. `gitleaks` at `pre-commit` is a complementary **git-level** net for
  this repo's own commits (and recommended for your team's repos) — it is **not**
  installed by the plugin; the shipped write-side protection is the regex hook.
- **Prompt-guard is heuristic and warn-only** — new phrasing bypasses it. The
  durable mitigation against injection is _containment_ (the block/ask gates
  above), which neutralises the action a payload would trigger, not detection.
- **MCP tools are not matched** — only the core tools above are. Scope your MCP
  servers narrowly.

For the complete model — what is and isn't defended, trust assumptions, and where
other defenses must live — see [`THREAT_MODEL.md`](./THREAT_MODEL.md).
