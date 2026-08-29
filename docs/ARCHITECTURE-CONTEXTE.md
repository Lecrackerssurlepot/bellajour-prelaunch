# Comment ce dépôt parle à Claude

Pourquoi la documentation est rangée ainsi, avec la source officielle de chaque mécanique.
Toutes les citations viennent de la documentation Claude Code, vérifiées le 29/08/2026.

---

## Le problème qu'on résout

Un `CLAUDE.md` n'est pas lu une fois : il est **renvoyé au modèle à chaque tour de conversation**.
Le nôtre faisait 731 lignes. Chaque message payait le mapping des templates Brevo pour déplacer
un padding.

La documentation le dit et donne le seuil :

> « CLAUDE.md files are loaded into the context window at the start of every session, consuming
> tokens alongside your conversation. »
> « **Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and
> reduce adherence. »
> — [memory.md](https://code.claude.com/docs/en/memory)

« reduce adherence » est le vrai coût. Ce n'est pas qu'une question d'argent : au-delà d'une
certaine taille, **les instructions sont moins suivies**. Un avertissement noyé dans 731 lignes
a le même poids qu'une note de nommage.

---

## La mécanique qui porte tout : l'imbrication est paresseuse

C'est LA citation qui justifie l'architecture :

> « CLAUDE.md and CLAUDE.local.md files in the directory hierarchy **above** the working directory
> are loaded at launch. **Files in subdirectories load on demand when Claude reads files in those
> directories.** »
> — [memory.md § Choose where to put CLAUDE.md files](https://code.claude.com/docs/en/memory)

Et, redit ailleurs :

> « Claude also discovers CLAUDE.md and CLAUDE.local.md files in subdirectories under your current
> working directory. **Instead of loading them at launch, they are included when Claude reads
> files in those subdirectories.** »

D'où le découpage : un socle court à la racine, et six fichiers de dossier qui n'arrivent que
lorsqu'on ouvre le dossier concerné.

| Fichier | Lignes | Chargé |
|---|---|---|
| `CLAUDE.md` | 84 | toujours |
| `src/app/CLAUDE.md` | 80 | en touchant une page ou une feuille de style |
| `src/lib/atelier/CLAUDE.md` | 80 | en touchant la machine de l'atelier |
| `src/app/api/CLAUDE.md` | 47 | en touchant une route |
| `src/app/admin/CLAUDE.md` | 41 | en touchant le back-office |
| `supabase/CLAUDE.md` | 43 | en touchant une migration |
| `scripts/CLAUDE.md` | 26 | en touchant un script |

Ils s'**additionnent** au socle, ils ne le remplacent pas :

> « All discovered files are concatenated into context rather than overriding each other. »

⚠️ Conséquence à connaître : éditer une route API charge `src/app/CLAUDE.md` **et**
`src/app/api/CLAUDE.md`, parce que le second est sous le premier. C'est voulu — 127 lignes au lieu
de 731, et les deux sont pertinentes.

### Ce qui NE marche pas, et qu'on aurait pu croire

Les imports `@chemin` semblent faits pour ça. Ils ne le sont pas :

> « Imported files are **expanded and loaded into context at launch** alongside the CLAUDE.md that
> references them. »
> « Splitting into `@path` imports helps organization but **doesn't reduce context**, since
> imported files load at launch. »

Un `@docs/atelier.md` dans le socle aurait tout rechargé à chaque session. C'est le piège exact
qu'on évite. (Profondeur maximale : quatre sauts, si on s'en sert quand même pour l'organisation.)

### Ce qu'on n'a pas utilisé, et pourquoi

`.claude/rules/` existe et fait presque la même chose, avec un `paths:` en frontmatter :

> « Rules can be scoped to specific files using YAML frontmatter with the `paths` field. These
> conditional rules only apply when Claude is working with files matching the specified patterns. »
> « **Rules without a `paths` field are loaded unconditionally** and apply to all files. »

C'est l'outil juste pour une règle **transversale** qui ne vit pas dans un dossier — par exemple
« tout fichier `**/*.test.ts` ». Ici, nos six domaines correspondent exactement à six dossiers :
l'imbrication suffit et se lit mieux (le fichier est à côté du code qu'il décrit). Le jour où une
règle traversera les dossiers, c'est `.claude/rules/` qu'il faudra, pas un septième CLAUDE.md.

---

## La règle qui empêche la rechute

Le fichier n'avait pas grossi par négligence : il avait grossi parce que **rien ne distinguait une
règle d'un fait daté**. L'audit du 29/08 a mesuré : 42 % d'invariant, 38 % d'état périssable,
20 % de faux ou de mort. Et les six sections de référence rapide — structure des fichiers,
variables d'environnement, tables Supabase, tokens de design, assets, composants UI — étaient
fausses **toutes les six**. Ce sont celles qu'on lit en premier.

D'où la règle : **un `CLAUDE.md` ne contient que ce qui survit ; tout fait daté va dans
`docs/reference/ETAT-PRODUCTION.md`.**

La documentation officielle valide ce tri, via ce que `/doctor` propose de couper :

> « The `/doctor` checkup proposes trims for a checked-in CLAUDE.md: it **cuts content Claude can
> derive from the codebase, such as directory layouts, dependency lists, and architecture
> overviews**, and **keeps pitfalls, rationale, and conventions that differ from tool defaults**. »

C'est exactement l'opération faite : la section « Structure fichiers » (un plan de dossiers que je
peux lire moi-même, et qui mentait sur 4 chemins sur 13) est partie ; les pièges et les raisons
sont restés.

---

## Les sous-agents : pourquoi ils économisent, et ce qu'ils ne voient pas

> « Use one when a side task would flood your main conversation with search results, logs, or file
> contents you won't reference again: **the subagent does that work in its own context and returns
> only the summary.** »
> — [sub-agents.md](https://code.claude.com/docs/en/sub-agents)

Un agent peut lire vingt fichiers et ne rendre que cinq lignes. C'est ce qui permet d'enchaîner
des tickets toute une journée sans saturer la conversation.

**Ce qu'un sous-agent reçoit** : son propre prompt système, la tâche, **toute la hiérarchie
CLAUDE.md** (donc nos règles de dossier s'appliquent aussi à eux), l'état git, et les skills
préchargés.
**Ce qu'il ne reçoit pas** : l'historique de la conversation, le style de sortie, et la mémoire
automatique. Un agent est donc **aveugle à ce qui vient d'être dit** — il faut tout mettre dans
la tâche qu'on lui confie.

Les cinq de ce dépôt, et pourquoi ceux-là :

| Agent | Outils | Rôle |
|---|---|---|
| `verificateur` | lecture seule | tranche si un ticket est réel **avant** qu'on y touche |
| `front` | + navigateur | ce qui se voit ; ne commit pas |
| `backend` | édition | la mécanique ; n'envoie aucun mail réel, ne commit pas |
| `recetteur` | Bash | types, lint, build, harnais ; ne corrige rien |
| `gardien` | lecture seule | sécurité, performance, SEO, accessibilité ; n'écrit pas |

La séparation « qui constate » / « qui répare » est délibérée : un agent qui trouve un problème et
le corrige dans le même mouvement ne sait plus dire s'il l'a vraiment trouvé.

La restriction d'outils est réelle, pas décorative :

> « This example uses `tools` to allow only Read, Grep, Glob, and Bash. **The subagent can't edit
> files, write files, or use any MCP tools.** »

⚠️ Coût à surveiller : **les descriptions des agents sont chargées au démarrage.**
> « Those descriptions take up context, so keep them short. When the combined descriptions of your
> subagents […] exceed 15,000 tokens, Claude Code shows a warning at startup. »
Les nôtres font une ligne chacune. Ne pas les laisser enfler.

---

## Les commandes : un corps qui ne coûte rien tant qu'on ne s'en sert pas

> « Unlike CLAUDE.md content, **a skill's body loads only when it's used**, so long reference
> material costs almost nothing until you need it. »
> — [skills.md](https://code.claude.com/docs/en/skills)

Et, verbatim, sur le format qu'on a choisi :

> « **Custom commands have been merged into skills.** A file at `.claude/commands/deploy.md` and a
> skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way. »

Nos quatre — `/ticket`, `/travailler`, `/point`, `/recette` — vivent dans `.claude/commands/`.
Seule leur description est en contexte ; la procédure ne se charge qu'à l'invocation.

⚠️ Une fois chargé, un skill **reste** en contexte :
> « Once a skill loads, its content stays in context across turns, so every line is a recurring
> token cost. »
D'où des procédures courtes. Et `/travailler` porte `disable-model-invocation: true` : c'est une
séance de travail autonome, elle se déclenche parce qu'on l'a décidé, jamais parce qu'une phrase
y ressemblait.

---

## Les hooks : la seule contrainte qui ne se négocie pas

La documentation est explicite sur la différence entre une règle et une garantie :

> « Claude treats them as context, **not enforced configuration**. **To block an action regardless
> of what Claude decides, use a PreToolUse hook instead.** »
> — [memory.md](https://code.claude.com/docs/en/memory)

C'est pour ça que « jamais de push sur `main` » est écrit dans le socle **et** posé en hook. Le
texte oriente, le hook empêche.

`.claude/hooks/garde-main.sh` (`PreToolUse`, matcher `Bash`) refuse trois gestes : commit sur
`main`, push vers `main`, et `git add -A` à la racine (qui embarquerait `design-explorations/` et
`assets/typo/`, hors git par la décision D4). Il rend le verdict documenté :

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse",
    "permissionDecision": "deny", "permissionDecisionReason": "…" } }
```

`.claude/hooks/etat-session.sh` (`SessionStart`) injecte trois lignes : le compte de tickets par
gravité, les bloquants, la branche. C'est l'un des trois seuls événements dont la sortie est vue :

> « The exceptions are `UserPromptSubmit`, `UserPromptExpansion`, and `SessionStart`, where Claude
> Code **adds plain-text stdout as context that Claude can see and act on**. »
> — [hooks.md](https://code.claude.com/docs/en/hooks)

⚠️ Les hooks d'un projet ne tournent qu'après acceptation de la fenêtre de confiance du dossier.
Sur une machine neuve, il faut l'accepter une fois.

---

## Vérifier que tout ça marche vraiment

Trois gestes, dans une session :

- **`/context`** — liste sous « Memory files » ce qui est réellement chargé. C'est la preuve.
  Au démarrage, on doit y voir `CLAUDE.md` seul ; après avoir ouvert un fichier de `src/lib/atelier/`,
  son `CLAUDE.md` doit y apparaître en plus.
- **`/memory`** — ouvre et édite les fichiers d'instructions.
- **hook `InstructionsLoaded`** — si un doute persiste sur le chargement paresseux :
  > « When a CLAUDE.md or `.claude/rules/*.md` file is loaded into context. Fires at session start
  > and when files are lazily loaded during a session. »
  Ses matchers (`session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`)
  disent *pourquoi* un fichier est arrivé.

⚠️ Après un `/compact`, seul le `CLAUDE.md` racine est réinjecté d'office ; les fichiers de
dossier reviennent quand on rouvre un fichier du dossier. C'est sans conséquence en pratique,
mais explique qu'une règle « disparaisse » au milieu d'une longue séance.

---

## Astuce gratuite

> « Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped before
> the content is injected into Claude's context. »

Une note pour un humain dans un `CLAUDE.md` ne coûte aucun token. À utiliser pour les
« pourquoi » destinés à un lecteur, pas au modèle.

---

## Sources

- [Mémoire et CLAUDE.md](https://code.claude.com/docs/en/memory)
- [Sous-agents](https://code.claude.com/docs/en/sub-agents)
- [Skills et commandes](https://code.claude.com/docs/en/skills)
- [Hooks](https://code.claude.com/docs/en/hooks)
