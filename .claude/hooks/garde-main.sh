#!/bin/bash
# Garde-fou : rien ne part sur main, et rien n'embarque les dossiers hors git.
# Refuse en rendant un verdict JSON ; sortie 0 dans tous les cas (le blocage est dans le JSON).

entree=$(cat)
cmd=$(printf '%s' "$entree" | jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$cmd" ] && exit 0

refuser() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# La branche qui compte est celle du dossier OÙ LA COMMANDE TOURNE (`cwd` de
# l'entrée du hook), pas celle de $CLAUDE_PROJECT_DIR. Dans un worktree, ce
# dernier désigne le dossier principal, resté sur main : le garde-fou refusait
# alors tout commit d'une branche de travail (vécu le 16/10). Repli sur
# $CLAUDE_PROJECT_DIR si l'entrée ne donne pas de dossier.
dossier=$(printf '%s' "$entree" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$dossier" ] && dossier="$CLAUDE_PROJECT_DIR"
branche=$(git -C "$dossier" rev-parse --abbrev-ref HEAD 2>/dev/null)

# Un message de commit est de la PROSE, pas une commande. Sans ça, écrire
# « pourquoi l'ajout massif est interdit » dans un message se faisait refuser
# par la règle 3 — vécu le 29/08. On neutralise l'argument de -m/--message
# AVANT toute analyse, et lui seul : le reste de la ligne reste inspecté, pour
# ne pas ouvrir un trou à qui glisserait une commande entre guillemets.
analyse=$(printf '%s' "$cmd" | perl -0777 -pe \
  's/(?:-m|--message)\s+"(?:\\.|[^"])*"//gs; s/(?:-m|--message)\s+\x27[^\x27]*\x27//gs' 2>/dev/null)
[ -z "$analyse" ] && analyse="$cmd"   # perl absent : on retombe sur la ligne entière

# Lire le `cwd` ouvre une porte : depuis un worktree, `cd <dossier sur main> &&
# git commit` ou `git -C <dossier> commit`. Chaque dossier visé par un `cd` ou
# un `git -C` compte donc aussi, et un seul sur main suffit à refuser.
cibles=$(printf '%s' "$analyse" | perl -ne \
  'while (/(?:^|[;&|(]\s*)cd\s+("[^"]*"|\x27[^\x27]*\x27|[^\s;&|)]+)/g) { print "$1\n" }
   while (/git\s+-C\s+("[^"]*"|\x27[^\x27]*\x27|[^\s;&|)]+)/g) { print "$1\n" }' 2>/dev/null)
while IFS= read -r cible; do
  [ -z "$cible" ] && continue
  cible=${cible#[\"\']}; cible=${cible%[\"\']}
  case "$cible" in
    /*) ;;
    "~"*) cible="$HOME${cible#\~}" ;;
    *) cible="$dossier/$cible" ;;
  esac
  [ "$(git -C "$cible" rev-parse --abbrev-ref HEAD 2>/dev/null)" = "main" ] && branche=main
done <<< "$cibles"

# Les options glissées entre `git` et sa sous-commande (`git -C <dossier> commit`,
# `git -c cle=valeur push`) : sans elles, ces deux formes passaient sous les
# règles 1 et 2 sans être vues (trouvé par la batterie le 16/10).
OPTS='([[:space:]]+-[Cc][[:space:]]+[^[:space:];&|]+)*'

# 1. Aucun push vers main, quelle que soit la branche locale.
#    ⚠️ On n'inspecte QUE le segment de la commande `git push`, pas la ligne
#    entière : un `git push <branche> && gh pr create --base main` se faisait
#    refuser a tort, alors qu'il pousse une branche de travail. Un garde-fou
#    qui crie a tort finit par etre desactive, et c'est ainsi qu'on perd la
#    protection le jour ou elle sert vraiment.
if printf '%s' "$analyse" | grep -Eq "(^|[;&|(]\s*)git$OPTS\s+push"; then
  segment=$(printf '%s' "$analyse" | grep -oE "git$OPTS[[:space:]]+push[^;&|]*" | head -1)
  if printf '%s' "$segment" | grep -Eq '(\s|:)main(\s|$)'; then
    refuser "Push vers main refusé (règle du socle, CLAUDE.md). Pousse la branche de travail et laisse Mathias décider de la fusion."
  fi
  if [ "$branche" = "main" ]; then
    refuser "Push depuis main refusé (règle du socle, CLAUDE.md). Crée une branche : git checkout -b chantier/<sujet>"
  fi
fi

# 2. Aucun commit tant qu'on est sur main.
if printf '%s' "$cmd" | grep -Eq "(^|[;&|(]\s*)git$OPTS\s+commit" && [ "$branche" = "main" ]; then
  refuser "Commit sur main refusé (règle du socle, CLAUDE.md). Crée une branche : git checkout -b chantier/<sujet>"
fi

# 3. Aucun ajout massif à la racine : design-explorations/ et assets/typo/ sont hors git (D4).
#    ⚠️ Même correction qu'en 1, et le cas s'est présenté : un `git commit -m`
#    dont le MESSAGE citait « git add -A » se faisait refuser. On extrait donc
#    chaque segment `git add …` et on n'inspecte que ceux-là. Tous, pas le
#    premier : un ajout massif cache derrière un ajout ciblé doit être vu.
if printf '%s' "$analyse" | grep -oE 'git[[:space:]]+add[^;&|]*' \
     | grep -Eq '^git[[:space:]]+add[[:space:]]+(-A|--all|\.)([[:space:]]|$)'; then
  refuser "git add -A / git add . refusé (D4 + D8). design-explorations/ et assets/typo/ doivent rester hors git. Ajoute les chemins un par un."
fi

exit 0
