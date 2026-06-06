# syntax=docker/dockerfile:1
#
# harness-setup-example — demo image
#
# This image serves two purposes:
#
#   1. ENGINE DEMO (default): runs check + apply against an isolated HOME so the
#      operator's real ~/.claude is never touched. No auth required.
#
#   2. FULL LIVE FLOW (optional): the Claude Code CLI is installed in the image.
#      When ANTHROPIC_API_KEY is provided at `docker run` time, you can run the
#      complete flow: install the marketplace plugin, then run /harness-setup
#      inside a real Claude Code session — all in an isolated container HOME.
#      NEVER commit API keys; always pass them via env var.
#
# Default entrypoint: engine demo (check then apply on the isolated HOME).
# For the full live flow see the usage section below and docker/README.md.
#
# NOTE (R12.3): Running the Claude Code CLI inside the container depends on the
# CLI being available there. The engine-only demo works with no auth.
#
# Usage — engine demo (no auth needed):
#   docker build -t harness-demo -f docker/Dockerfile .
#   docker run --rm harness-demo
#
# Usage — full live flow (requires ANTHROPIC_API_KEY):
#   docker run --rm -it -e ANTHROPIC_API_KEY=sk-ant-... harness-demo bash
#   # Inside the container:
#   #   claude plugin marketplace add /app
#   #   claude plugin install jrobic-cc-harness-setup-example
#   #   claude   (then run /harness-setup)
#
# Cross-platform note:
#   To build for linux/amd64 from an Apple Silicon host:
#   docker buildx build --platform linux/amd64 -t harness-demo -f docker/Dockerfile .

FROM oven/bun:1.3.14-slim

# ---------------------------------------------------------------------------
# Non-root user + isolated HOME
# ---------------------------------------------------------------------------
RUN useradd --create-home --uid 1001 harness
ENV HOME=/home/harness
# HARNESS_HOME isolates the engine's writes to this container directory.
# The operator's real ~/.claude on the host is never mounted or accessed.
ENV HARNESS_HOME=/home/harness/.claude-harness-demo
WORKDIR /app

# ---------------------------------------------------------------------------
# Copy repo
# ---------------------------------------------------------------------------
COPY --chown=harness:harness . /app

# ---------------------------------------------------------------------------
# Install Node.js (needed for Claude Code CLI) and the CLI itself
# ---------------------------------------------------------------------------
# We install Node via nodesource so `npm` is available, then install the CLI
# globally. This step is skipped if you only need the engine-only demo — the
# image still works without the CLI for the default entrypoint.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g @anthropic-ai/claude-code && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

USER harness

# ---------------------------------------------------------------------------
# Default entrypoint: engine demo
# Runs check (audit, exit 3 expected on a fresh HOME), then apply.
# Demonstrates the full check → apply cycle without any auth or network.
# ---------------------------------------------------------------------------
CMD ["sh", "-c", \
  "echo '=== Harness engine demo (isolated HOME: $HARNESS_HOME) ===\n' && \
   echo '--- check (expect exit 3: configuration incomplete) ---' && \
   bun run /app/plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts check; \
   echo '\n--- apply ---' && \
   bun run /app/plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts apply && \
   echo '\n--- check again (expect exit 0: configuration complete) ---' && \
   bun run /app/plugins/jrobic-cc-harness-setup-example/scripts/harness-setup.ts check"]
