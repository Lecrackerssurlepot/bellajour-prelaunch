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
#
# Depuis le 16/10, chaque cas porte son verdict ATTENDU et la batterie compte
# les ecarts : elle ne depend plus de la branche du dossier ou on la lance.
# Deux depots jetables, l'un sur main, l'autre sur une branche, tiennent lieu
# de dossier principal et de worktree.
cd "$(dirname "$0")/../.." || exit 1
echo "Garde-fou — batterie de non-regression"
A="-A"

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
for d in sur-main:main sur-branche:chantier/essai; do
  git init -q -b "${d#*:}" "$T/${d%%:*}"
  git -C "$T/${d%%:*}" -c user.name=essai -c user.email=essai@exemple.fr commit -q --allow-empty -m init
done
SUR_MAIN="$T/sur-main"
SUR_BRANCHE="$T/sur-branche"
export CLAUDE_PROJECT_DIR="$SUR_BRANCHE"

ecarts=0
# essai ATTENDU COMMANDE LIBELLE [CWD]
essai() {
  local json
  json=$(python3 -c 'import json,sys
e={"tool_input":{"command":sys.argv[1]}}
if len(sys.argv)>2 and sys.argv[2]: e["cwd"]=sys.argv[2]
print(json.dumps(e))' "$2" "$4")
  local vu=autorise
  printf '%s' "$json" | .claude/hooks/garde-main.sh | grep -q deny && vu=REFUSE
  if [ "$vu" = "$1" ]; then
    printf '  %-8s | %s\n' "$vu" "$3"
  else
    printf '  %-8s | %s   <-- ECART, attendu %s\n' "$vu" "$3" "$1"
    ecarts=$((ecarts + 1))
  fi
}

essai REFUSE   "git push origin main"                                   "push vers main"
essai REFUSE   "git push origin HEAD:main"                              "push HEAD:main"
essai REFUSE   "git push --force origin main"                           "push force main"
essai autorise "git push -u origin ma-branche"                          "push d'une branche"
essai autorise "git push -u origin ma-br && gh pr create --base main"   "push branche + PR vers main"
essai REFUSE   "git add $A"                                             "ajout massif"
essai REFUSE   "git add ."                                              "ajout du dossier courant"
essai REFUSE   "git add src/x.ts && git add $A"                          "ajout cible PUIS massif"
essai autorise "git add .claude/hooks/g.sh"                             "ajout cible"
essai autorise "git commit -m \"pourquoi git add $A est interdit\""      "message CITANT l'ajout massif"
essai REFUSE   "git commit -m \"ok\" && git add $A"                      "message + vrai ajout massif"

echo "  — la branche est celle du dossier de la commande (cwd), pas du dossier principal —"
CLAUDE_PROJECT_DIR="$SUR_MAIN" \
essai autorise "git commit -m \"ok\""                       "commit depuis un worktree sur branche, dossier principal sur main" "$SUR_BRANCHE"
essai REFUSE   "git commit -m \"ok\""                       "commit, cwd sur main"                     "$SUR_MAIN"
CLAUDE_PROJECT_DIR="$SUR_MAIN" \
essai REFUSE   "git commit -m \"ok\""                       "commit sans cwd, dossier principal sur main"
essai REFUSE   "git push -u origin ma-branche"              "push depuis un cwd sur main"              "$SUR_MAIN"
essai autorise "git push -u origin ma-branche"              "push depuis un cwd sur branche"           "$SUR_BRANCHE"
essai REFUSE   "cd $SUR_MAIN && git commit -m \"ok\""       "cd vers main puis commit, depuis une branche" "$SUR_BRANCHE"
essai REFUSE   "(cd \"$SUR_MAIN\" && git commit -m ok)"     "sous-shell cd vers main puis commit"      "$SUR_BRANCHE"
essai REFUSE   "git -C $SUR_MAIN commit -m \"ok\""          "git -C vers main puis commit"             "$SUR_BRANCHE"
essai REFUSE   "cd ../sur-main && git commit -m ok"         "cd relatif vers main puis commit"         "$SUR_BRANCHE"
essai REFUSE   "git -c user.name=x commit -m ok"            "option -c glissee, commit sur main"       "$SUR_MAIN"
essai REFUSE   "git -C $SUR_MAIN push -u origin ma-branche" "git -C vers main puis push"               "$SUR_BRANCHE"
essai autorise "cd $SUR_BRANCHE && git commit -m \"ok\""    "cd vers une branche puis commit"          "$SUR_BRANCHE"
essai autorise "git -C $SUR_MAIN status"                    "git -C vers main sans commit ni push"     "$SUR_BRANCHE"
essai autorise "git commit -m \"cd $SUR_MAIN pour voir\""   "message CITANT un cd vers main"           "$SUR_BRANCHE"

if [ "$ecarts" -eq 0 ]; then echo "TOUT PASSE"; else echo "$ecarts ECART(S)"; exit 1; fi
