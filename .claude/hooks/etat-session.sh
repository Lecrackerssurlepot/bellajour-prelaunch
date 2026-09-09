#!/bin/bash
# Injecté au démarrage de session. Doit rester COURT : ce texte est payé à chaque session.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
idx="docs/backlog/INDEX.md"
[ -f "$idx" ] || exit 0

# ⚠️ ON NE COMPTE QUE LES TICKETS OUVERTS (corrigé le 09/09/2026).
# Le compteur lisait TOUTES les lignes du tableau, fiches fermées comprises :
# il annonçait « 4 bloquants » — T-001, T-040, T-050, T-098 — alors que les
# quatre fiches sont dans `fermes/` depuis des jours, et que l'INDEX écrit
# noir sur blanc « AUCUN bloquant, pour de vrai ». Idem pour le reste : 77
# sérieux au lieu de 31, 47 avis-requis au lieu de 35.
# Une alarme fausse à chaque ouverture de session finit par couvrir la vraie.
# La dernière colonne porte l'état : **fermé** ou **refuse** sortent du compte.
ouverts() { grep "$1" "$idx" 2>/dev/null | grep -vcE '\*\*(fermé|ferme|refuse|refusé)\*\*'; }
branche=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
bloq=$(ouverts '| bloquant |')
serieux=$(ouverts '| serieux |')
avis=$(ouverts 'avis-requis')

echo "Backlog Bellajour : ${bloq} bloquant(s), ${serieux} sérieux, ${avis} qui attendent une décision de Mathias. Branche : ${branche}."
if [ "${bloq:-0}" -gt 0 ] 2>/dev/null; then
  grep '| bloquant |' "$idx" | grep -vE '\*\*(fermé|ferme|refuse|refusé)\*\*' \
    | sed -E 's/^\| *([^|]+[^ |]) *\| *([^|]+[^ |]).*/  bloquant \1 : \2/'
fi
echo "Le détail est dans docs/backlog/INDEX.md : ne l'ouvrir que si la demande porte sur le travail restant."
