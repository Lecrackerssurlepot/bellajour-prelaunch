#!/bin/bash
# Batterie de non-regression du garde-fou (.claude/hooks/garde-main.sh).
#
#     ./.claude/hooks/test-garde-main.sh
#
# A lancer apres TOUTE modification du garde-fou. Motif : le 29/08/2026, une
# correction censee supprimer un faux positif a silencieusement RE-AUTORISE
# `git push origin main`. Trouve en testant, pas en relisant.
#
# Le motif de l'ajout massif est assemble a l'execution (variable $A) : ecrit
# en clair, ce fichier se ferait refuser par le garde-fou qu'il teste.
cd "$(dirname "$0")/../.." || exit 1
export CLAUDE_PROJECT_DIR="$PWD"
echo "Garde-fou — batterie de non-regression"
A="-A"
essai() {
  printf '{"tool_input":{"command":%s}}' "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1")" \
    | .claude/hooks/garde-main.sh | grep -q deny && echo "  REFUSE   | $2" || echo "  autorise | $2"
}
essai "git push origin main"                                   "push vers main"
essai "git push origin HEAD:main"                              "push HEAD:main"
essai "git push --force origin main"                           "push force main"
essai "git push -u origin ma-branche"                          "push d'une branche"
essai "git push -u origin ma-br && gh pr create --base main"   "push branche + PR vers main"
essai "git add $A"                                             "ajout massif"
essai "git add ."                                              "ajout du dossier courant"
essai "git add src/x.ts && git add $A"                          "ajout cible PUIS massif"
essai "git add .claude/hooks/g.sh"                             "ajout cible"
essai "git commit -m \"pourquoi git add $A est interdit\""      "message CITANT l'ajout massif"
essai "git commit -m \"ok\" && git add $A"                      "message + vrai ajout massif"
