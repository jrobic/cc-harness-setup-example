# Contributing

## Conventional Commits

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).
Commit messages are validated locally by **commitlint** (via a Lefthook
`commit-msg` hook). The type drives the next release version:

| Type                                                | Release        |
| --------------------------------------------------- | -------------- |
| `feat:`                                             | minor (`0.x`)  |
| `fix:` / `perf:`                                    | patch          |
| `feat!:` / `fix!:` / body with `BREAKING CHANGE:`   | major          |
| `docs:` `chore:` `refactor:` `test:` `ci:` `build:` | **no release** |

> Anything that changes the **plugin's behaviour** (engine, command, skill,
> `.mcp.json`, `reference/deny.json`) must be committed as `feat:` or `fix:` —
> otherwise it won't trigger a version bump and installs won't pick it up via
> `/plugin marketplace update`.

## Local hooks (Lefthook)

Installed automatically on `bun install` (the `prepare` script runs
`lefthook install`). They run:

- **commit-msg** → `commitlint` (validates the message)
- **pre-commit** → `dprint check` + `oxlint` + `gitleaks protect --staged` (deep
  secret scan; skipped automatically if `gitleaks` isn't installed)
- **pre-push** → `bun test`

Run them manually with `bunx lefthook run pre-commit`. Skip in an emergency with
`LEFTHOOK=0 git commit …` (don't make a habit of it).

## Branching

Trunk-based: keep work-in-progress on **feature branches**. Merge to `main` only
when it is release-worthy — every push to `main` runs the release job.

## Releases (automated)

Releases are cut by **semantic-release** in GitHub Actions
([`.github/workflows/release.yml`](.github/workflows/release.yml)) on every push
to `main`. There is **no manual version bump** — for a release-worthy change the
job will:

1. analyse the commits since the last `vX.Y.Z` tag,
2. write the new version into `package.json` and the plugin's
   [`plugin.json`](plugins/jrobic-cc-harness-setup-example/.claude-plugin/plugin.json)
   (via `scripts/sync-version.mjs`),
3. update `CHANGELOG.md`, create the `vX.Y.Z` tag and a GitHub release,
4. commit the bump back to `main` with `[skip ci]`.

Once released, the bumped `plugin.json` version is what `/plugin marketplace
update` detects.

> **First release / baseline tag.** semantic-release derives the next version
> from the latest `vX.Y.Z` git tag. Seed the baseline once so the first automated
> release continues from `0.1.0` instead of jumping to `1.0.0`:
>
> ```bash
> git tag v0.1.0 <commit-on-main> && git push origin v0.1.0
> ```

Preview what would be released (no writes, no tag) with:

```bash
bun run release:dry
```
