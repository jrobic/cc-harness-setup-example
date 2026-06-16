# Infographic brief — "New MacBook → your team's Claude setup in one command"

A brief you can hand to **Claude Design** (or any designer) to produce the
onboarding infographic. It tells the story of a developer who unboxes a
brand-new MacBook Pro, installs Claude Code, adds this plugin, and runs one
command to apply the team's baseline — a sensible deny list, the shared context,
and the tooling. The point is **easy setup of Claude with the team's agreed
minimum**, which also makes day-to-day use a little safer. It is not a security
product.

The commands below are **the real, current commands** — render them verbatim so
the infographic stays reproducible.

---

## Goal & audience

- **Goal:** show, in one glance, that going from a blank machine to a
  team-configured Claude Code is **four short steps** — easy setup first, a
  little extra safety second (not a security product).
- **Audience:** developers / DevOps seeing the harness for the first time
  (conference slide, README hero image, internal onboarding page).
- **Tone:** clean, technical, matter-of-fact. No marketing superlatives, no
  overclaiming on security.

## Format

- **Orientation:** vertical (poster / slide-friendly), or a 4-panel horizontal
  strip. Pick whichever Claude Design renders cleanest.
- **Aspect:** 4:5 (vertical) or 16:9 (strip).
- **Headline:** _New MacBook → your team's Claude setup in one command_
- **Sub-headline:** _Install Claude Code · add the team plugin · run `/harness-setup`_

## Visual language — Plasma design system

Reuse the **Plasma** infographic tokens (warm paper, two signal colours, mono +
sans pairing). Items are told apart by mono tags, pills, left mark bars and
sectioning — **not** by per-layer hues.

- **Palette (Plasma tokens):**
  - Background `#FAF9F5` · surfaces `#F0EEE6` / `#E3DACC` / `#D1CFC5`
  - Ink (text) `#141413` · muted label `#87867F`
  - **Accent — now / active / emphasis:** terracotta `#D97757`
  - **Future — roadmap / planned:** sage `#788C5D`
- **Type:** Inter (titles / UI), JetBrains Mono (technical labels, commands,
  tags, numbers).
- **Command panels:** Plasma "code cards" — `#F0EEE6` surface, 1.5px `#E3DACC`
  border, 10px radius, JetBrains Mono ink text, terracotta prompt glyph. Not a
  dark macOS terminal — stay on warm paper.
- **Layers without hue:** enforcement / tooling / context are distinguished by
  mono labels + pills, not colour. Terracotta = what runs today; sage = roadmap;
  ink + warm neutrals = structure. Keep the **deny ≠ context** distinction
  legible in the labels.
- A simple left-to-right or top-to-bottom progress rail (1 → 2 → 3 → 4) using
  thin ink rules + corner ticks (Plasma motif).

---

## Storyboard (4 panels)

### Panel 1 — Day one, blank machine

- Visual: an unboxed, brand-new MacBook Pro, screen on, nothing installed yet.
- Caption: **"A fresh laptop. No team setup yet."**

### Panel 2 — Install Claude Code

- Visual: terminal window. Show these commands exactly:

  ```bash
  brew install node bun                       # node → Claude Code · bun → harness engine
  npm install -g @anthropic-ai/claude-code
  claude                                      # launch & sign in
  ```

- Caption: **"Install the agent (+ Bun for the engine)."**
- (Optional small note: native installer alternative —
  `curl -fsSL https://claude.ai/install.sh | bash`.)
- Why Bun: the harness engine runs in soft mode via `bun run harness-setup.ts`,
  so Bun must be present for `/harness-setup` to work (see ADR-0002).

### Panel 3 — Add the plugin

- Visual: terminal window. Show these commands exactly:

  ```bash
  claude plugin marketplace add jrobic/cc-harness-setup-example
  claude plugin install jrobic-cc-harness-setup-example
  ```

- Caption: **"Add the harness plugin (tooling layer)."**
- Tint this panel **blue** (tooling).

### Panel 4 — One command applies the harness

- Visual: the Claude Code TUI with the slash command typed in:

  ```
  /harness-setup
  ```

- Show the result as ticked items in the Plasma signal system (no red/green/blue):
  - **Enforcement** → deny list merged into `settings.json` — terracotta/ink
    "done" check _(today)_. Plus a separate **sage "FUTURE" item**: guardrail
    hooks (PreToolUse — secret-leak / denied commands), styled like Plasma's
    `.future` (sage `#788C5D` border + pill), clearly not-yet-applied.
  - **Plugin tooling active** → Datadog MCP + `glab` / `aws` CLI skills — done check.
  - **Team context imported** → `CLAUDE.md` — done check.
- Layers are labelled, not hue-coded. Caption: **"Confirm once. Harness applied.
  Backups written."**

### Footer / payoff

- Strapline: **"Three layers. One command. Every file backed up."**
- Small print: _Nothing is written without confirmation — `check → confirm →
  apply`._

---

## Hard requirements (accuracy)

- Do **not** invent flags or rename commands. Use the four command blocks above
  verbatim.
- Plugin name is exactly `jrobic-cc-harness-setup-example`; marketplace ref is
  `jrobic/cc-harness-setup-example`.
- The slash command is exactly `/harness-setup`.
- Keep the **deny ≠ context** distinction visible — via labels/pills now, not
  hue (the Plasma system drops per-layer colours).
- **Honesty on hooks:** what `/harness-setup` installs today is the deny list +
  context import (the plugin also ships a SessionStart _nudge_ hook, not a
  guardrail). The **guardrail hooks** (PreToolUse secret-leak / denied-command
  detection) are the **roadmap** end-goal — show them as "next", never as an
  already-applied tick.
- **Bun is a real prerequisite** (engine runs via `bun run`), so the install
  panel must show it alongside Node.
- No secrets, no API keys anywhere in the image.

---

## Ready-to-paste prompt for Claude Design

> Create a clean, technical onboarding infographic titled **"New MacBook → your
> team's Claude setup in one command"**, sub-headline **"Install Claude Code ·
> add the team plugin · run /harness-setup"**. Vertical 4:5 (or a 4-panel
> horizontal strip).
>
> Four numbered panels with a left-to-right progress rail:
>
> 1. **Day one** — an unboxed brand-new MacBook Pro, nothing installed. Caption
>    "A fresh laptop. No team setup yet."
> 2. **Install Claude Code** — a macOS terminal window showing exactly:
>    `brew install node bun` / `npm install -g @anthropic-ai/claude-code` /
>    `claude`. Caption "Install the agent (+ Bun for the engine)."
> 3. **Add the plugin** (tint blue) — a terminal showing exactly:
>    `claude plugin marketplace add jrobic/cc-harness-setup-example` /
>    `claude plugin install jrobic-cc-harness-setup-example`. Caption "Add the
>    harness plugin."
> 4. **Apply** — the Claude Code TUI with `/harness-setup` typed, resolving to
>    "done" checks (terracotta/ink): "Enforcement — deny list merged
>    (settings.json)", "Plugin tooling active: Datadog MCP + glab/aws CLI
>    skills", "Team context imported (CLAUDE.md)". Add ONE separate sage
>    `#788C5D` "FUTURE" item — "guardrail hooks (PreToolUse — secret-leak /
>    denied commands)" — clearly not-yet-applied. Caption "Confirm once. Harness
>    applied. Backups written."
>
> Footer strapline: "Three layers. One command. Every file backed up." Use the
> **Plasma** aesthetic: warm paper #FAF9F5, ink #141413, terracotta accent
> #D97757 for active/now, sage #788C5D for roadmap, muted label #87867F; Inter +
> JetBrains Mono; command blocks as light mono "code cards" on #F0EEE6 (not a
> dark terminal). Distinguish the three layers by mono labels/pills, not hue.
> Technical, matter-of-fact tone; no marketing superlatives, don't overclaim
> security, no secrets in the image.

---

## Alternative aesthetics (A/B variants)

The ready-to-paste prompt above is **Variant A — Plasma**. Below are two more
visual directions to test in parallel. **Same content, same captions, same
accuracy rules** (exact commands incl. `brew install node bun`; guardrail hooks
shown as roadmap, never an applied tick; exact plugin/marketplace/command names;
no secrets) — only the visual language changes.

### Variant B — Hand-drawn notebook

> Create an onboarding infographic titled **"New MacBook → your team's Claude
> setup in one command"**, sub-headline **"Install Claude Code · add the team
> plugin · run /harness-setup"**, in a **hand-drawn engineer's-notebook /
> sketchnote** style. Vertical 4:5 (or a 4-panel strip).
>
> Aesthetic: cream paper `#FBF7EC` with a faint dot-grid, dark-pen ink `#1F2933`,
> wobbly rounded boxes (Excalidraw / rough.js look), hand-drawn arrows linking
> panels, circled hand-drawn digits 1–4. One **amber highlighter** accent
> `#F4C744` swiped under key words. Fonts: **Caveat** (handwritten — titles,
> captions, annotations) + **JetBrains Mono** (all commands, kept crisp and
> copy-accurate inside a "taped code card" / sticky note). Hand-drawn ✔ checks in
> ink.
>
> Four panels with a hand-drawn progress arrow 1 → 2 → 3 → 4:
>
> 1. **Day one** — a sketched, unboxed MacBook Pro, nothing installed. Caption
>    "A fresh laptop. No team setup yet."
> 2. **Install Claude Code** — a taped code card showing exactly
>    `brew install node bun` / `npm install -g @anthropic-ai/claude-code` /
>    `claude`. Caption "Install the agent (+ Bun for the engine)." Pencil note:
>    "node → Claude Code · bun → engine".
> 3. **Add the plugin** — a taped code card:
>    `claude plugin marketplace add jrobic/cc-harness-setup-example` /
>    `claude plugin install jrobic-cc-harness-setup-example`. Caption "Add the
>    team plugin."
> 4. **Apply** — `/harness-setup` handwritten in a card, resolving to hand-drawn
>    ✔ checks: "Enforcement — deny list → settings.json", "Plugin tooling:
>    Datadog MCP + glab/aws CLI skills", "Team context → CLAUDE.md". Add ONE
>    **dashed pencil box** (not a check) labelled "later ✎ — guardrail hooks
>    (PreToolUse: secret-leak / denied commands)", visibly lighter / roadmap.
>    Caption "Confirm once. Harness applied. Backups written."
>
> Footer (handwritten): "Three layers. One command. Every file backed up." Warm,
> human, technical-but-friendly tone; no marketing superlatives; don't overclaim
> security; no secrets in the image.

### Variant C — Dark mode tech

> Create an onboarding infographic titled **"New MacBook → your team's Claude
> setup in one command"**, sub-headline **"Install Claude Code · add the team
> plugin · run /harness-setup"**, in a **dark IDE / terminal** style. Vertical
> 4:5 (or a 4-panel strip).
>
> Aesthetic: near-black background `#0D1117`, surfaces `#161B22`, hairline
> borders `#30363D`, text `#E6EDF3`, muted `#8B949E`. One bright accent — **cyan
> `#39D0D8`** for active/now emphasis; **green `#3FB950`** for "done" checks;
> roadmap items **dimmed** (lower opacity + muted grey). Real dark **macOS
> terminal windows** (traffic-light dots) for command panels, light syntax-style
> highlighting. Fonts: **JetBrains Mono** (commands, labels, primary) + **Inter**
> (headings). A subtle glowing progress rail 1 → 2 → 3 → 4. Restrained — no heavy
> neon.
>
> Four terminal panels:
>
> 1. **Day one** — a dark, idle terminal on a fresh MacBook Pro. Caption "A fresh
>    laptop. No team setup yet."
> 2. **Install Claude Code** — terminal showing exactly `brew install node bun` /
>    `npm install -g @anthropic-ai/claude-code` / `claude`. Caption "Install the
>    agent (+ Bun for the engine)." Comment line: `# node → Claude Code · bun → engine`.
> 3. **Add the plugin** — terminal:
>    `claude plugin marketplace add jrobic/cc-harness-setup-example` /
>    `claude plugin install jrobic-cc-harness-setup-example`. Caption "Add the
>    team plugin."
> 4. **Apply** — a Claude Code TUI mock with `/harness-setup`, resolving to green
>    `#3FB950` "done" checks: "Enforcement — deny list → settings.json", "Plugin
>    tooling: Datadog MCP + glab/aws CLI skills", "Team context → CLAUDE.md". Add
>    ONE **dimmed, commented-out line** `# guardrail hooks (PreToolUse:
>    secret-leak / denied commands) — roadmap` at lower opacity (never a lit
>    check). Caption "Confirm once. Harness applied. Backups written."
>
> Footer strapline: "Three layers. One command. Every file backed up."
> Technical, matter-of-fact tone; no marketing superlatives; don't overclaim
> security; no secrets in the image.

---

See [`how-it-works.md`](how-it-works.md) for the architecture diagrams behind
each layer referenced in panel 4.
