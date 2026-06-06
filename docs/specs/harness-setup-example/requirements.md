# Requirements — harness-setup-example

Acceptance criteria for the Phase 1 OSS skeleton. Written in EARS form
(`WHEN <event> THE SYSTEM SHALL <behaviour>`) where an event/response framing
fits, and as plain `THE SYSTEM SHALL` statements for invariants.

Terms (harness, three layers, deny list, scope/precedence, idempotence, backup,
soft vs hardened, engine, out-of-plugin writes, clone & go) are defined in
[`/CONTEXT.md`](../../../CONTEXT.md) and are not re-defined here.

Scope boundary: this spec covers the **Phase 1 scope** only. Real business
hooks/skills/agents/MCP, managed/MDM promotion, and a populated `.mcp.json` are
out of scope (Phase 2+) and appear here only as documented placeholders.

---

## 1. Engine — check

- **R1.1** WHEN the engine is invoked with `check` THE SYSTEM SHALL report, for
  the resolved home, which reference deny rules are missing from
  `permissions.deny` and whether the context import line is present in
  `CLAUDE.md`, without writing to any file.
- **R1.2** WHEN `check` finds the deny list complete AND the import present THE
  SYSTEM SHALL exit with code `0`.
- **R1.3** WHEN `check` finds any missing deny rule OR a missing import THE
  SYSTEM SHALL exit with code `3`.
- **R1.4** WHEN the target `settings.json` exists but contains invalid JSON THE
  SYSTEM SHALL report the file and the parse error and exit with code `2`,
  writing nothing.
- **R1.5** WHEN the target `settings.json` or `CLAUDE.md` does not exist THE
  SYSTEM SHALL treat them as empty (no deny rules, no import) rather than error.

## 2. Engine — apply

- **R2.1** WHEN the engine is invoked with `apply` THE SYSTEM SHALL merge the
  reference deny rules into `permissions.deny` by concatenation and
  de-duplication, leaving every other field of `settings.json` unchanged.
- **R2.2** WHEN `apply` writes the context file THE SYSTEM SHALL copy the
  reference context to `<home>/.claude/harness/CONTEXT.md`, creating parent
  directories as needed.
- **R2.3** WHEN `apply` ensures the import THE SYSTEM SHALL guarantee exactly one
  managed import block in `CLAUDE.md`, delimited by begin/end markers, containing
  the import line.
- **R2.4** WHEN `apply` completes successfully THE SYSTEM SHALL exit with code `0`
  and print a summary stating that backups were created for any modified file.
- **R2.5** THE SYSTEM SHALL write only to `<home>/.claude/settings.json`,
  `<home>/.claude/CLAUDE.md`, and `<home>/.claude/harness/CONTEXT.md`. It SHALL
  NOT modify any other file.

## 3. Idempotence

- **R3.1** WHEN `apply` runs a second time against a state already produced by
  `apply` THE SYSTEM SHALL leave `permissions.deny` with no duplicate rules.
- **R3.2** WHEN `apply` runs against a `CLAUDE.md` that already contains the
  managed import block THE SYSTEM SHALL keep exactly one block and not duplicate
  the import line.
- **R3.3** WHEN the import line is already present in `CLAUDE.md` outside the
  managed markers THE SYSTEM SHALL NOT add a second import.
- **R3.4** WHEN `check` runs immediately after a successful `apply` THE SYSTEM
  SHALL exit with code `0`.

## 4. Deny merge

- **R4.1** THE SYSTEM SHALL treat the reference deny file as the single source of
  truth for deny rules; the engine SHALL NOT invent rules not present in it.
- **R4.2** WHEN merging deny rules THE SYSTEM SHALL preserve rules already present
  in `permissions.deny` that are not in the reference set.
- **R4.3** WHEN no deny rule is missing THE SYSTEM SHALL leave `settings.json`
  byte-unchanged and create no backup for it.

## 5. Context import block

- **R5.1** THE SYSTEM SHALL delimit the managed import with stable begin/end
  markers so the block can be located and replaced on subsequent runs.
- **R5.2** WHEN inserting the block into a non-empty `CLAUDE.md` THE SYSTEM SHALL
  append it after the existing content, separated by a blank line, without
  altering prior content.
- **R5.3** THE SYSTEM SHALL place the managed context file at a path the import
  line references, so the import resolves after `apply`.

## 6. Backups

- **R6.1** WHEN the engine is about to modify an existing file THE SYSTEM SHALL
  first copy it to `<file>.bak-<timestamp>`.
- **R6.2** WHEN a target file does not yet exist THE SYSTEM SHALL create it
  without producing a backup.

## 7. Home resolution / isolation

- **R7.1** THE SYSTEM SHALL resolve the target home directory from the
  environment, so the engine can be pointed at an isolated home for tests and the
  Docker demo without touching the operator's real `~/.claude`.
- **R7.2** WHEN no isolation override is set THE SYSTEM SHALL default to the
  current user's home directory.

## 8. SessionStart nudge hook

- **R8.1** WHEN a session starts AND the harness configuration is incomplete THE
  SYSTEM SHALL emit a non-blocking message inviting the developer to run
  `/harness-setup`.
- **R8.2** WHEN a session starts AND the configuration is complete THE SYSTEM
  SHALL emit nothing.
- **R8.3** THE nudge hook SHALL be advisory only and SHALL NOT modify any file or
  block the session.

## 9. Command and skill (human-in-the-loop)

- **R9.1** WHEN the developer runs `/harness-setup` THE SYSTEM SHALL run `check`,
  present any missing deny rules and missing import, and request explicit
  confirmation before any write.
- **R9.2** WHEN the developer declines OR does not confirm THE SYSTEM SHALL NOT
  write anything.
- **R9.3** WHEN the developer confirms THE SYSTEM SHALL run `apply` and present
  the summary, stating that `.bak-<timestamp>` backups were created and that no
  other content was changed.
- **R9.4** WHEN the command cannot resolve the engine path via the plugin-root
  environment variable THE SYSTEM SHALL fall back to locating the engine by
  filesystem search under the installed plugins directory.
- **R9.5** THE skill SHALL trigger on intents to set up / configure / verify /
  audit the harness, deny list, or team context, and SHALL follow the same
  confirm-before-write flow as the command.

## 10. Soft vs hardened distribution

- **R10.1** WHEN the harness is distributed in **soft** mode THE hooks and command
  SHALL invoke the engine as Bun-run TypeScript source.
- **R10.2** WHEN the harness is distributed in **hardened** mode THE build SHALL
  produce a standalone binary via Bun's compile step, and the hooks and command
  SHALL invoke that binary.
- **R10.3** In both modes the engine SHALL produce identical `check`/`apply`
  behaviour and exit codes.
- **R10.4** THE documentation SHALL state plainly that the hardened binary is not
  enforcement: it only hardens the tooling against accidental/trivial edits, real
  enforcement is the deny list, and only the managed scope is non-bypassable.
  Documentation SHALL NOT claim the binary is tamper-proof or unmodifiable.

## 11. Generic install (public and private)

- **R11.1** THE README SHALL document registering the marketplace from a public
  GitHub repo using the `org/repo` shorthand.
- **R11.2** THE README SHALL document registering the marketplace from a generic
  private git host over HTTPS using a full git URL and the developer's existing
  credential helper.
- **R11.3** THE repository SHALL contain no organisation-specific reference: no
  named internal git host or host-specific auth CLI, no in-house certificate
  authority, no security/IT organisation, no specific model backend, and no MDM /
  managed-enforcement rollout.

## 12. Docker / devcontainer demo (isolated)

- **R12.1** THE repository SHALL provide a Docker image, based on a Bun base
  image, that runs `check`/`apply` against an isolated home so the operator's real
  `~/.claude` is never touched during a demo.
- **R12.2** THE devcontainer configuration SHALL be an optional wrapper over the
  same Dockerfile and SHALL NOT duplicate the build.
- **R12.3** THE demo documentation SHALL state that running the Claude Code CLI
  inside the container depends on the CLI being installed/available there, and
  SHALL NOT assume it is present.

## 13. Tests

- **R13.1** THE repository SHALL include `bun test` tests covering: `check` exit
  codes (`0`/`2`/`3`), deny concat + dedup, single-import idempotence, backup
  creation, the "no change ⇒ no backup" case, and home isolation via the
  environment override.
- **R13.2** Tests SHALL run against an isolated temporary home and SHALL NOT touch
  the operator's real `~/.claude`.

## 14. CI

- **R14.1** WHEN a commit is pushed or a pull request is opened THE GitHub Actions
  workflow SHALL run the linter and `bun test`.
- **R14.2** WHEN lint or tests fail THE workflow SHALL fail.

## 15. Placeholders (documented, not implemented in Phase 1)

- **R15.1** THE plugin SHALL ship an empty `.mcp.json` documented as a Phase 2
  placeholder.
- **R15.2** THE specs/docs SHALL note that real business hooks/skills/agents/MCP
  and managed/MDM promotion are Phase 2+ and intentionally absent here.
