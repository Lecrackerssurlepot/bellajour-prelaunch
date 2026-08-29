#!/bin/bash
# Garde-fou : rien ne part sur main, et rien n'embarque les dossiers hors git.
# Refuse en rendant un verdict JSON ; sortie 0 dans tous les cas (le blocage est dans le JSON).

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$cmd" ] && exit 0

refuser() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

branche=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)

# 1. Aucun push vers main, quelle que soit la branche locale.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|]\s*)git\s+push'; then
  if printf '%s' "$cmd" | grep -Eq '(\s|:)main(\s|$)'; then
    refuser "Push vers main refusé (règle du socle, CLAUDE.md). Pousse la branche de travail et laisse Mathias décider de la fusion."
  fi
  if [ "$branche" = "main" ]; then
    refuser "Push depuis main refusé (règle du socle, CLAUDE.md). Crée une branche : git checkout -b chantier/<sujet>"
  fi
fi

# 2. Aucun commit tant qu'on est sur main.
if printf '%s' "$cmd" | grep -Eq '(^|[;&|]\s*)git\s+commit' && [ "$branche" = "main" ]; then
  refuser "Commit sur main refusé (règle du socle, CLAUDE.md). Crée une branche : git checkout -b chantier/<sujet>"
fi

# 3. Aucun ajout massif à la racine : design-explorations/ et assets/typo/ sont hors git (D4).
if printf '%s' "$cmd" | grep -Eq '(^|[;&|]\s*)git\s+add\s+(-A|--all|\.)(\s|$)'; then
  refuser "git add -A / git add . refusé (D4 + D8). design-explorations/ et assets/typo/ doivent rester hors git. Ajoute les chemins un par un."
fi

exit 0
