#!/bin/bash
# Injecté au démarrage de session. Doit rester COURT : ce texte est payé à chaque session.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
idx="docs/backlog/INDEX.md"
[ -f "$idx" ] || exit 0

compte() { grep -c "$1" "$idx" 2>/dev/null | head -1; }
branche=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
bloq=$(compte '| bloquant |')
serieux=$(compte '| serieux |')
avis=$(compte 'avis-requis')

echo "Backlog Bellajour : ${bloq} bloquant(s), ${serieux} sérieux, ${avis} qui attendent une décision de Mathias. Branche : ${branche}."
if [ "${bloq:-0}" -gt 0 ] 2>/dev/null; then
  grep '| bloquant |' "$idx" | sed -E 's/^\| *([^|]+[^ |]) *\| *([^|]+[^ |]).*/  bloquant \1 : \2/'
fi
echo "Le détail est dans docs/backlog/INDEX.md : ne l'ouvrir que si la demande porte sur le travail restant."
