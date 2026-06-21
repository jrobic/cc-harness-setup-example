# Hooks de garde-fous — ce qu'ils font, ce qu'ils protègent

> 🇬🇧 English version: [`guardrails.md`](./guardrails.md)

Le harness embarque quatre **hooks de garde-fous** qui s'exécutent
automatiquement tant que le plugin est activé — pas besoin de `/harness-setup`
pour eux (cette commande configure la liste deny _statique_ ; les hooks sont la
couche _active_). Ils s'interposent entre l'agent et ta machine et interviennent
**avant** qu'un appel d'outil risqué ne s'exécute.

**Posture : défense en profondeur, pas un sandbox.** Ces hooks arrêtent un agent
qui hallucine une commande dangereuse, une injection de prompt évidente, un
secret égaré, ou un faux pas humain. Un adversaire déterminé qui peut déjà lancer
un shell arbitraire contournera des hooks à base de correspondance de chaînes —
voir [Limites connues](#limites-connues) et le [`THREAT_MODEL.md`](./THREAT_MODEL.md)
complet.

## Les quatre gardes

| Garde                    | Se déclenche sur                         | Ce qu'il fait                                                                                                                                                      | Protège contre                                                                                                               |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **`guard-command`**      | commandes Bash                           | **Bloque** les commandes destructrices / d'exfiltration / d'escalade ; **demande confirmation** pour les ops git qui réécrivent l'historique ou sont destructrices | `rm -rf /`, effacement disque, fork bombs, `curl … \| bash`, upload de fichiers, `sudo`, setuid, `git push --force`, …       |
| **`guard-secret`**       | Read / Edit / Write / Grep / Glob / Bash | **Bloque** l'accès aux fichiers & dossiers porteurs de secrets (symlinks résolus)                                                                                  | lecture de `.env`, clés SSH/PGP, `~/.aws/credentials`, tokens `.npmrc`, état Terraform, `secrets/`, …                        |
| **`guard-write-secret`** | Write / Edit / MultiEdit                 | **Bloque** l'écriture d'une **valeur** de secret en dur dans un fichier                                                                                            | inscrire une clé AWS, un PAT GitHub, un token Slack, une clé privée, un JWT… dans le code                                    |
| **`guard-prompt`**       | chaque prompt soumis                     | **Avertit** le modèle de traiter les directives intégrées comme des données non fiables                                                                            | injection de prompt dans des pages web / issues / docs collées ("ignore previous instructions", tags `<system>` injectés, …) |

## Comment chacun se comporte

Trois niveaux d'intervention, alignés sur les décisions de hook de Claude Code :

- **Bloquer (`deny`)** — l'appel d'outil est refusé net, avec la raison montrée au
  modèle. Utilisé par `guard-command` (commandes dangereuses), `guard-secret` et
  `guard-write-secret`.
- **Demander (`ask`)** — Claude Code affiche une confirmation ; tu approuves ou
  refuses. Utilisé par `guard-command` pour les opérations git pouvant réécrire
  l'historique ou muter un remote. Ça fonctionne **par inversion** : une petite
  allowlist de sous-commandes git sûres (`status`, `diff`, `log`, `add`,
  `commit`, `fetch`, …) passe en silence ; **tout le reste** demande — donc une
  sous-commande git nouvelle/inconnue demande par défaut, sans toucher au code.
- **Avertir (contexte)** — rien n'est bloqué ; le hook injecte une note indiquant
  au modèle que le texte soumis correspond à des signatures d'injection et doit
  être traité comme des données. Utilisé par `guard-prompt` (bloquer tes propres
  prompts serait trop bruyant).

Chaque hook **échoue en mode ouvert** (fail-open) : sur une entrée vide ou
malformée il autorise l'appel plutôt que de casser ta session. Les refus sont
journalisés (mode `0600`, rotation à 5 Mo) à côté de chaque script de hook.

## Deux couches, un harness

| Couche        | Mise en place par                                              | Quoi                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Statique**  | `/harness-setup` écrit `permissions.deny` dans `settings.json` | Globs deny natifs pour la lecture de fichiers-secrets — présents même hooks éteints. Le plancher minimal.                                                                  |
| **Dynamique** | Les hooks du plugin (cette page)                               | Analyse du contenu des commandes, correspondance secrets plus riche, détection côté écriture, avertissements d'injection. Attrape ce que les globs ne savent pas exprimer. |

Elles se recouvrent volontairement : une lecture de fichier-secret est attrapée
par les deux. Le statique est le plancher ; les hooks sont la couche active,
consciente du contenu.

## Limites connues

Honnêtes, par construction (chacune couverte par un test `known limits` pour que
tout changement soit intentionnel) :

- **L'obfuscation shell** déjoue les matchers Bash : `rm -rf "/"`, `D=/; rm -rf $D`,
  `rm -rf $(echo /)`, chemins encodés hex/base64, heredocs, interpréteurs natifs
  (`python -c "open('/etc/passwd')"`).
- **La détection de secret côté écriture est regex seule** — les encodages
  exotiques passent. `gitleaks` au `pre-commit` est un filet **git-level**
  complémentaire, pour les commits de CE repo (et recommandé pour les repos de
  ton équipe) — il n'est **pas** installé par le plugin ; la protection côté
  écriture livrée, c'est le hook regex.
- **Le prompt-guard est heuristique et averti-seulement** — un phrasé nouveau le
  contourne. La mitigation durable contre l'injection est le _confinement_ (les
  gardes block/ask ci-dessus), qui neutralise l'action qu'un payload
  déclencherait, pas la détection.
- **Les outils MCP ne sont pas matchés** — seuls les outils cœur ci-dessus le
  sont. Restreins finement tes serveurs MCP.

Pour le modèle complet — ce qui est défendu ou non, les hypothèses de confiance,
et où les autres défenses doivent vivre — voir [`THREAT_MODEL.md`](./THREAT_MODEL.md).

Pour lire le code : chaque règle, regex, et le flux d'exécution exact sont
documentés dans [`guardrails-internals.fr.md`](./guardrails-internals.fr.md) (pour
qui modifie ou étend un guard).
