# Comment ça marche

Version française de [`how-it-works.md`](how-it-works.md).

Une visite guidée du harness : les trois couches, le flux `check → apply`, la
précédence des scopes, le knob soft/hardened, et la couche outillage (serveurs
MCP + skills adossés à des CLI). Les termes en **gras** sont définis dans
[`CONTEXT.md`](../CONTEXT.md).

---

## 1. Les trois couches

Un harness n'est pas un seul fichier. Il s'étend sur trois couches aux
**propriétés de confiance différentes** — cette séparation est tout l'enjeu du
design.

```mermaid
flowchart TD
    subgraph H["Harness"]
        E["🔒 Enforcement<br/>permissions.deny dans settings.json<br/><i>dur — l'agent ne peut pas le contourner</i>"]
        T["🧩 Outillage (Tooling)<br/>commands · skills · hooks · serveurs MCP<br/><i>portable — livré comme plugin</i>"]
        C["📝 Contexte<br/>import CLAUDE.md<br/><i>souple — indicatif, surchargeable</i>"]
    end

    E -. "deny ≠ contexte<br/>(une interdiction ne vit jamais en prose)" .-> C

    classDef hard fill:#fde2e2,stroke:#c0392b,color:#7b1f1f;
    classDef tool fill:#e2ecfd,stroke:#2c6fbb,color:#1f3a7b;
    classDef soft fill:#e7f6e7,stroke:#3a9b3a,color:#1f5f1f;
    class E hard
    class T tool
    class C soft
```

> **Invariant clé — deny ≠ contexte.** Une interdiction dure appartient à la deny
> list (ou à un hook `PreToolUse`), jamais à `CLAUDE.md`. `CLAUDE.md` est une
> guidance dont on peut détourner l'agent par l'argumentation.

Ce dépôt livre les trois : les règles deny (`reference/deny.json`), l'outillage
du plugin (commands, skill, hook, **et des serveurs MCP** — §5), et le gabarit de
contexte (`reference/CONTEXT.md`).

---

## 2. Ce qu'un plugin peut et ne peut pas écrire

Un **plugin** Claude Code distribue l'outillage proprement. Mais deux des trois
couches ne sont **pas** des composants de plugin — le format plugin ne sait pas
les exprimer. Le moteur effectue exactement ces deux écritures, avec ton accord.

```mermaid
flowchart LR
    subgraph PLUGIN["Plugin (livré via marketplace)"]
        cmd["commands/"]
        skill["skills/"]
        hook["hooks/"]
        mcp[".mcp.json"]
    end

    subgraph ENGINE["Moteur — les deux écritures hors-plugin"]
        deny["① fusion deny → ~/.claude/settings.json"]
        ctx["② import contexte → ~/.claude/CLAUDE.md"]
    end

    PLUGIN -->|s'installe proprement| User1["~/.claude/plugins/…"]
    ENGINE -->|"confirmation explicite + backup"| User2["~/.claude/settings.json<br/>~/.claude/CLAUDE.md"]
```

C'est la raison d'être du moteur : la couche plugin est nécessaire mais **pas
suffisante** pour configurer un harness complet.

---

## 3. Le flux `check → apply`

Le moteur est déterministe et sans dépendances. Il expose deux sous-commandes et
communique ses résultats par **codes de sortie**. L'agent n'écrit jamais sans une
confirmation explicite entre `check` et `apply`.

```mermaid
sequenceDiagram
    actor Dev as Développeur·euse
    participant CC as Claude Code<br/>(/harness-setup)
    participant Eng as Moteur (check/apply)
    participant FS as ~/.claude (ou $HARNESS_HOME)

    Dev->>CC: /harness-setup
    CC->>Eng: check
    Eng->>FS: lit settings.json + CLAUDE.md
    Eng-->>CC: exit 0 = complet · 3 = incomplet · 2 = erreur
    alt incomplet (exit 3)
        CC-->>Dev: présente les règles deny manquantes + l'import absent
        Dev->>CC: confirme ✅
        CC->>Eng: apply
        Eng->>FS: backup → fusion deny (concat+dedup) → garantit 1 bloc d'import
        Eng-->>CC: appliqué, .bak-<ts> créé
        CC->>Eng: check (re-vérifie)
        Eng-->>CC: exit 0 = complet
    else déjà complet (exit 0)
        CC-->>Dev: rien à faire
    end
```

**Contrat de codes de sortie :** `0` complet · `2` erreur · `3` incomplet. Même
contrat en mode soft et hardened (§4). Les backups (`<fichier>.bak-<timestamp>`)
sont écrits avant toute modification, donc l'état précédent est toujours
récupérable.

---

## 4. Scope & précédence

La configuration est superposée sur plusieurs scopes. Les valeurs **scalaires**
se résolvent par précédence (le scope supérieur l'emporte) ; les valeurs
**tableau** comme la deny list sont **fusionnées** (concaténées et dédupliquées)
entre scopes — jamais écrasées.

```mermaid
flowchart TD
    M["Managed<br/><b>non-contournable</b>"] --> CLI["Flags CLI"] --> L["Local"] --> P["Projet"] --> U["User (~/.claude)"]

    note["Scalaires : le scope le plus haut gagne<br/>Tableaux (deny/allow) : concat + dedup sur tous les scopes"]

    classDef managed fill:#fde2e2,stroke:#c0392b,color:#7b1f1f;
    class M managed
```

Le moteur écrit dans le scope **User** (`~/.claude`). Seul le scope **managed**
est réellement non-contournable par le propriétaire de la machine — contexte
important pour le caveat d'honnêteté ci-dessous.

---

## 5. Outillage : serveurs MCP et CLI

La couche outillage n'est pas que des serveurs MCP — c'est la capacité portable
la mieux adaptée au besoin. Pour une stack DevOps typique, on fait un choix
délibéré :

| Cible       | Mécanisme                            | Pourquoi                                                                |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------- |
| **Datadog** | **serveur MCP** (officiel, OAuth)    | Pas de vraie CLI pour interroger metrics/logs/traces — le MCP convient. |
| **GitLab**  | **CLI** `glab` → skill _(plus tard)_ | `glab` couvre déjà MR/pipelines/issues ; on l'emballe dans un skill.    |
| **AWS**     | **CLI** `aws` → skill _(plus tard)_  | La CLI `aws` est la surface canonique ; un skill la cadre pour l'agent. |

> Règle de pouce : prends un **serveur MCP** quand il n'y a pas de bonne CLI (ou
> que la donnée est structurée et orientée requête, comme l'observabilité) ;
> prends un **skill au-dessus d'une CLI** quand un outil en ligne de commande
> mature existe déjà. Ajouter un serveur MCP inutile, c'est juste plus de surface
> à authentifier et maintenir.

```mermaid
flowchart LR
    subgraph PLUG[".mcp.json (couche outillage)"]
        E["example<br/>stdio · npx · sans auth"]
        D["datadog<br/>type: http · OAuth"]
    end
    subgraph SKILLS["skills/ (prévus)"]
        G["gitlab → CLI glab"]
        A["aws → CLI aws"]
    end

    E --> EC["/mcp : ✓ connecté<br/>(tools d'exemple : echo, get-env, …)"]
    D -. "${DATADOG_MCP_URL} non défini" .-> DE["échoue en silence → absent de /mcp<br/>(définir l'endpoint pour connecter)"]

    classDef ok fill:#e7f6e7,stroke:#3a9b3a,color:#1f5f1f;
    classDef skel fill:#f4f4f4,stroke:#999,color:#555,stroke-dasharray: 4 3;
    classDef plan fill:#fff7e6,stroke:#c98a00,color:#7a5300,stroke-dasharray: 4 3;
    class EC ok
    class DE skel
    class G,A plan
```

Le [`.mcp.json`](../plugins/jrobic-cc-harness-setup-example/.mcp.json) du plugin
déclare **deux** serveurs MCP — un qui connecte tout seul (pour la démo) et un
exemple réaliste qui demande une config par utilisateur.

### `example` — un MCP vivant, sans identifiant

Le serveur `example` est le **serveur de référence MCP** officiel
(`@modelcontextprotocol/server-everything`), lancé via `npx` en stdio, **sans
auth**. Il connecte immédiatement, donc `/mcp` montre un MCP fonctionnel et ses
tools d'exemple (`echo`, `get-env`, `get-sum`, …). C'est un **placeholder pour
illustrer la couche outillage** — remplace-le par tes vrais serveurs.

> Astuce démo live : préchauffe-le une fois pour que la 1re connexion ne soit pas
> un téléchargement npm : `npx -y @modelcontextprotocol/server-everything`
> (Ctrl-C une fois démarré).

### MCP Datadog (exemple réaliste, à configurer)

Le plugin déclare aussi le **serveur MCP Datadog officiel** — transport HTTP,
**OAuth au runtime**, donc aucune clé d'API n'est jamais commitée. L'endpoint est
**spécifique à l'organisation/au site** ; ce dépôt le laisse en
`${DATADOG_MCP_URL}`. **Variable non définie, Claude Code ne peut pas résoudre
l'URL vide et le serveur échoue en silence — il n'apparaît _pas_ dans `/mcp`.**
C'est attendu : c'est un placeholder à configurer, pas un bug.

**Chemin recommandé — le plugin officiel de Datadog** (remplit l'endpoint, lance
l'OAuth) :

```text
/plugin install datadog@claude-plugins-official
/ddsetup        # choisis ton site, complète l'OAuth
```

**Chemin manuel** — définis l'endpoint, l'OAuth se déclenche à la 1re
utilisation :

```bash
export DATADOG_MCP_URL=<ton-endpoint-mcp-datadog>   # depuis /ddsetup ou la doc Datadog
claude            # /mcp → datadog → autorise via OAuth
```

Sites supportés : US1/US3/US5, EU (`datadoghq.eu`), AP1/AP2. **GovCloud n'est pas
supporté.** Voir la [doc de setup MCP Datadog](https://docs.datadoghq.com/fr/mcp_server/setup/?tab=claudecode).

### GitLab & AWS — CLI + skill (prévus, pas encore construits)

`glab` et la CLI `aws` font déjà le travail, donc ces cibles reçoivent des
**skills qui emballent la CLI** plutôt que des serveurs MCP. Pas implémentés à
cette phase — suivis dans [`PROGRESS.md`](specs/harness-setup-example/PROGRESS.md).
Une fois construits, ils vivront sous
`plugins/jrobic-cc-harness-setup-example/skills/` et appelleront la CLI que le
développeur a déjà authentifiée (`glab auth status`, `aws sso login`).

---

## 6. Soft vs hardened

Le moteur se livre en deux modes, choisis par un knob de build.

```mermaid
flowchart TD
    src["harness-setup.ts<br/>(TypeScript lisible)"]

    src -->|"soft (défaut)"| soft["le hook lance : bun run harness-setup.ts<br/>livré dans git"]
    src -->|"bun build --compile"| hard["dist/harness-setup (binaire)<br/>PAS dans git — construit à la demande"]

    soft --> same["comportement 0/2/3 identique<br/>(données de référence embarquées au build)"]
    hard --> same
```

> **Caveat d'honnêteté — hardened n'est _pas_ de l'enforcement.** Compiler ne fait
> que durcir l'**outillage** contre les éditions accidentelles ou triviales de la
> source. Le vrai enforcement, c'est la liste `permissions.deny` dans
> `settings.json`, et seul le scope **managed** est réellement non-contournable.
> « Compilé » ne doit jamais être vendu comme « inviolable ». Voir
> [ADR-0003](adr/0003-soft-vs-hardened-compile-knob.md).

---

## Voir aussi

- [`how-it-works.md`](how-it-works.md) — version anglaise (source)
- [`CONTEXT.md`](../CONTEXT.md) — glossaire du domaine
- [`docs/adr/`](adr/) — architecture decision records
- [`docs/infographic-brief.md`](infographic-brief.md) — brief de l'infographie d'onboarding (pour Claude Design)
- [`README.md`](../README.md) — chemins d'installation et démarrage rapide
