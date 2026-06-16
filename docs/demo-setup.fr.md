# Demo setup — runbook

🇬🇧 English version: [`demo-setup.md`](demo-setup.md).

Un runbook pour présenter le harness en live depuis un **état Claude Code neuf et
isolé**, sans toucher à ta vraie config `~/.claude`. Pensé pour répéter, reset, et
recommencer proprement (Mac mini ou MacBook).

> **Ce que la démo raconte.** Le harness, c'est le **minimum d'équipe** — une deny
> list de base, le contexte partagé, l'outillage — installé en une commande. Le
> dev ou la devops part de là et **ajoute ensuite ses propres plugins, skills et
> MCP** selon ses préférences. Ce n'est pas un produit de sécurité : c'est de la
> **facilitation de setup**, avec quelques garde-fous en bonus. L'objectif à terme
> des garde-fous, ce sont des **hooks** qui détectent les fuites de secrets et
> bloquent les commandes interdites — pas couvert par cette phase.

---

## 1. Modèle d'isolation (à comprendre avant tout)

Deux variables d'environnement, à **aligner sur le même dossier**, sinon la démo
écrit dans ta vraie config :

| Variable            | Qui la lit            | Rôle                                                          |
| ------------------- | --------------------- | ------------------------------------------------------------- |
| `CLAUDE_CONFIG_DIR` | **Claude Code**       | Où le CLI lit/écrit sa config (settings, plugins, sessions…). |
| `HARNESS_HOME`      | **le moteur harness** | Sa base ; il écrit dans `$HARNESS_HOME/.claude/…`.            |

Le moteur résout son chemin via `HARNESS_HOME ?? os.homedir()` et **n'utilise
pas** `CLAUDE_CONFIG_DIR` (voir `plugins/.../scripts/harness-setup.ts`). Donc :

- `CLAUDE_CONFIG_DIR` seul → Claude est isolé, **mais** `/harness-setup` écrirait
  dans `~/.claude` réel. ❌
- Les deux alignés sur `~/claude-demo/.claude` → ce que le moteur écrit = ce que
  Claude lit. ✅

```text
~/claude-demo/.claude/        ← CLAUDE_CONFIG_DIR pointe ici
  settings.json               ← deny list mergée par le moteur
  CLAUDE.md                   ← bloc d'import du contexte
  harness/CONTEXT.md          ← contexte d'équipe embarqué
  plugins/                    ← le plugin installé pendant la démo
HARNESS_HOME = ~/claude-demo  ← le moteur écrit dans $HARNESS_HOME/.claude/…
```

> Sur cette machine, `~/.claude` est un **symlink** vers `~/code/claude` (config
> versionnée). Ne fais jamais `mv ~/.claude` : tu casserais le lien. L'isolation
> par env n'y touche pas — rien à sauvegarder.

---

## 2. L'alias

Ajoute ceci à ton `~/.zshrc` (le dossier démo est créé à la volée) :

```bash
# Lance Claude Code dans un état neuf et isolé pour les démos
alias claude-demo='CLAUDE_CONFIG_DIR="$HOME/claude-demo/.claude" \
  HARNESS_HOME="$HOME/claude-demo" \
  sh -c '\''mkdir -p "$CLAUDE_CONFIG_DIR" && claude'\'''
```

Puis `source ~/.zshrc`. Lancer la démo = `claude-demo`.

Variante reset inclus (repart toujours de zéro) :

```bash
alias claude-demo-fresh='rm -rf "$HOME/claude-demo" && claude-demo'
```

---

## 3. Déroulé live (4 étapes = les 4 panneaux de l'infographie)

Une fois `claude-demo` lancé, dans la session :

```text
# 1. (machine neuve — Claude déjà installé : brew install node ; npm i -g @anthropic-ai/claude-code)
# 2. trust the folder → onboarding

# 3. Ajouter le plugin d'équipe
claude plugin marketplace add jrobic/cc-harness-setup-example
claude plugin install jrobic-cc-harness-setup-example

# 4. Appliquer le harness minimal
/harness-setup
#   → check (exit 3) → présente deny manquantes + import absent
#   → confirme (AskUserQuestion : Apply / Cancel) → apply → re-check (exit 0)

# 5. (optionnel) montrer la couche outillage
/mcp        # le serveur MCP `example` est connecté, avec ses tools
```

Message de clôture : **le dev part de ce minimum et ajoute ensuite ses propres
plugins / skills / MCP.**

> **Préchauffe le MCP avant de présenter** pour que le 1er `/mcp` ne soit pas un
> téléchargement npm : `npx -y @modelcontextprotocol/server-everything` (Ctrl-C
> une fois démarré). Le serveur `datadog` reste invisible tant que
> `DATADOG_MCP_URL` n'est pas défini — c'est attendu (voir
> [`how-it-works.fr.md` §5](how-it-works.fr.md#5-outillage--serveurs-mcp-et-cli)).

---

## 4. Vérifier l'isolation (avant de présenter)

```bash
# le dossier démo doit contenir la config écrite
ls -la "$HOME/claude-demo/.claude"        # settings.json, CLAUDE.md, harness/

# ta vraie config ne doit PAS avoir bougé
ls -la "$HOME/code/claude/settings.json"  # mtime inchangé
```

Si `settings.json` apparaît sous `~/code/claude` après un apply : les deux vars
n'étaient pas alignées — vérifie l'alias.

---

## 5. Reset entre deux répétitions

```bash
rm -rf "$HOME/claude-demo"   # puis relance claude-demo (ou directement claude-demo-fresh)
```

Aucun teardown : tout l'état de démo vit dans `~/claude-demo`, jamais ailleurs.

---

## 6. Authentification

Sur macOS, les credentials Claude Code vivent dans le **Keychain**, pas dans le
dossier de config. Conséquence :

- Avec un `CLAUDE_CONFIG_DIR` neuf, **tu restes connecté** — pas de re-login sur
  scène. 👍
- Pour _montrer_ l'étape login quand même : `/login` en session, ou supprime
  l'entrée Keychain avant de lancer :

  ```bash
  security delete-generic-password -l "Claude Code" 2>/dev/null || true
  ```

  (Le label exact peut varier ; liste-les avec
  `security dump-keychain | grep -i claude`.)

---

## 7. Machine vierge (vrai `~/.claude`)

Si tu démo sur une machine où `~/.claude` est un **vrai dossier** (pas un
symlink) : pas besoin de le déplacer non plus — `claude-demo` le contourne via
`CLAUDE_CONFIG_DIR`. Vérifie juste le type avant :

```bash
ls -ld "$HOME/.claude"   # 'l' en tête = symlink ; 'd' = vrai dossier
```

Dans les deux cas, l'alias isole la démo sans rien sauvegarder.

---

## Voir aussi

- [`demo-setup.md`](demo-setup.md) — version anglaise (source)
- [`how-it-works.md`](how-it-works.md) — architecture (FR : [`how-it-works.fr.md`](how-it-works.fr.md))
- [`infographic-brief.md`](infographic-brief.md) — brief de l'infographie d'onboarding
- [`../PRESENTATION.md`](../PRESENTATION.md) — talk track de la présentation
