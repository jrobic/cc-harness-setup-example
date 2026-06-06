# Docker — harness-setup-example

This directory contains the `Dockerfile` for the harness-setup demo image.

## Build

```bash
docker build -t harness-demo -f docker/Dockerfile .
```

Cross-platform (e.g. from Apple Silicon for a Linux CI):

```bash
docker buildx build --platform linux/amd64 -t harness-demo -f docker/Dockerfile .
```

## Run — engine-only demo (no auth required)

The default entrypoint runs `check → apply → check` against an isolated HOME
(`HARNESS_HOME=/home/harness/.claude-harness-demo`). Your real `~/.claude` is
never mounted or touched.

```bash
docker run --rm harness-demo
```

Expected output:

```
=== Harness engine demo (isolated HOME: /home/harness/.claude-harness-demo) ===

--- check (expect exit 3: configuration incomplete) ---
Harness — configuration status

  ✗ deny list: 11 missing rule(s):
      - Read(./.env)
      ...
  ✗ CLAUDE.md context: import absent (@~/.claude/harness/CONTEXT.md)

--- apply ---
✓ Harness applied (backups .bak-… created for any modified file).

--- check again (expect exit 0: configuration complete) ---
Harness — configuration status

  ✓ deny list: up to date
  ✓ CLAUDE.md context: import present
```

## Run — full live flow (requires ANTHROPIC_API_KEY)

> **Note (R12.3):** This flow depends on the Claude Code CLI being installed and
> a valid API key being available at runtime. The engine-only demo above works
> without any auth.

The image installs `@anthropic-ai/claude-code` via npm. Provide your API key at
`docker run` time — **never** commit it:

```bash
docker run --rm -it \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  harness-demo bash
```

Inside the container:

```bash
# Register this repo as a marketplace (the repo is copied to /app)
claude plugin marketplace add /app

# Install the plugin
claude plugin install jrobic-cc-harness-setup-example

# Start a Claude Code session
claude

# Inside the session, run:
# /harness-setup
```

The full flow runs entirely in the container's isolated HOME
(`/home/harness`). No file on the host is modified.

## Devcontainer

`.devcontainer/devcontainer.json` is a thin wrapper over this Dockerfile. Open
the repository in VS Code or any devcontainer-compatible editor and it will
build and use this image automatically.
