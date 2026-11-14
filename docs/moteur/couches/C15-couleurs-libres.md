# C15 : les couleurs libres et les combos (fond d'une page, couleur d'un texte, combos tirés des photos)

**Statut (14/11, lot G)** : branche `feat/mise-en-page-couleurs-libres`, non fusionnée. Règles R149 à R153 (`docs/reference/REGLES-TRI.md`).
Numérotée C15 et R149 : le lot F, fusionné avant (#363), a pris C14 et R140 à R148.

## Ce qu'elle fait
- **Pose** une couleur où l'atelier la veut : le FOND d'une page ou d'une double (indépendant du gabarit), la couleur de chaque
  TEXTE (titre, texte, légende, mot-titre et ligne de la couverture). Une couleur est un RÔLE du nuancier (elle suit le nuancier) ou
  un hexa (la pipette, les couleurs des photos, le choix libre).
- **Propose** quatre COMBOS d'après les palettes des photos (C09) : la couleur d'objet qui revient, sa complémentaire, une harmonie
  douce, un contraste fort. Un clic les pose sur les rôles du nuancier (aplat sourd, aplat clair, accent), « Annuler » les défait.
- **Reprend** les combos de la lecture IA quand elle est chargée (lot F, `lecture.couleurs`) : proposés après ceux des photos, sous
  « Lecture IA » ; un clic pose leurs six rôles (`combosDeLaLecture`, `combosProposes`).
- La machine propose, l'atelier choisit : rien n'est posé d'office.

## Où
- `src/lib/mise-en-page/couleursLibres.ts` : le type `CouleurLibre`, `couleurLibreValide`, `fondValide`, `piecesDuFond` (le fond en
  rectangles mm, une pièce pour une double unie), `hexDeCouleur`, `cssDeCouleur`, `nomDeCouleur`, `nuanceIdml`.
- `src/lib/mise-en-page/combos.ts` : `proposerCombos(palettes, nuancier)`, `estCielOuMer`, `comboApplique`, `REGLAGES_COMBOS`.
- `src/lib/mise-en-page/editeur/couleurs.ts` : les gestes purs `colorerFond`, `colorerTexte`, leurs libellés, `couleursPosees` ;
  les gestes `colorerFond`, `colorerTexte` (plans.ts) et `teinterTexte` (la couleur dans la séance d'écriture, etat.ts).
- Sauvegarde : `Planche.fond` et `TexteCadre.couleur`, facultatifs (sauvegarde.ts : `fondValide`, `CLES_FACULTATIVES_TEXTE`).
- Écran : `[id]/Nuances.tsx` (le sélecteur), `[id]/couleursEcran.ts` (palettes, combos mémoïsés), le bouton « Fond » du tiroir
  (`Gabarits.tsx`), la ligne de couleurs sous le texte qu'on écrit (`Scene.tsx`, `SceneCouverture.tsx`), les combos du panneau Style.
- Exports : `pdf.ts` (objet `fond`, couleur des textes avec et sans style), `idml.ts` (rectangles « Fond », nuances « Libre »,
  rôles sans style déclarés à leur valeur d'origine).

## Les réglages (de départ, `REGLAGES_COMBOS`)
- Ciel ou mer PRÉSUMÉS (les palettes ne disent pas où est le ciel) : une teinte de 185° à 295° qui revient sur 15 % des photos, ou
  pâle (L ≥ 60, C ≤ 40). Jamais la source d'un aplat ; la complémentaire bleue d'un ocre reste un ACCENT.
- Une couleur d'objet qui revient : deux photos au moins ; son score est multiplié par (C / 30)², au plus 1,6 (une veste, un mur
  peint battent un sable ou une falaise).
- Les clartés et saturations de l'aplat sourd, de l'aplat clair et de l'accent viennent du décideur de la démo du 13/11.

## Le rejeu (14/11)
Six lots réels (`cycle-1-2026-11-12/cache/`, palettes de lecture recalculées en local par sharp + `paletteDePixels`) :

| Lot | Dominante proposée | « Objet coloré » du décideur |
|---|---|---|
| Merisa (Madère) | Ocre #d58961 | ocre #ca7749 |
| Klervie (Madrid) | Ocre #824c2f | ocre #ce794d |
| Candice (Madrid) | Sable doré #bb945d | sable doré #b7883c |
| Lara | Ocre #785039 | bleu nuit #6292db (un bleu : ici présumé ciel) |
| Eloise | Terre cuite #b75049 | terre cuite #ad4742 |
| Marjorie | Ocre #775236 | sable doré #b28b3a |

Avant le poids de franchise, la dominante tombait sur un kaki de falaise (Merisa) ou un vert de jardin (Klervie). Avant le seuil de
15 %, le ciel de Lara (13 photos sur 53) passait pour un objet.

## Le test
`scripts/verif-mep-couleurs.ts` (lancé par `verif-atelier.ts`) ; les gestes entrent aussi dans les séquences au hasard de
`verif-mep-editeur.ts` (invariant G1). L'essai Affinity (D28) : `scripts/idml-essai-couleurs.ts`, EN ATTENTE.

## Ce qu'elle ne sait pas
- Où est le ciel dans une photo : c'est une présomption sur la teinte et la récurrence ; un lot de vestes bleues verra ses
  vestes prises pour du ciel (elles restent des accents possibles).
- Le contraste d'un texte sur la PHOTO qu'il recouvre (R-C-25) : le sélecteur montre la couleur, l'atelier juge.
- Le fond de la COUVERTURE : pas de fond libre sur la couverture (ses aplats restent ceux de son gabarit, recolorés par le nuancier).
- Les combos ont besoin d'un style (une paire) : sans style, le panneau ne les montre pas ; les fonds et les couleurs de texte, eux,
  marchent sans style (un rôle se lit alors dans le nuancier d'origine).

## Historique
- 14/11 : création (lot G), rejeu sur six lots réels.
