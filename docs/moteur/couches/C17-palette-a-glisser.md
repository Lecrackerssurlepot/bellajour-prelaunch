# C17 : la palette à glisser (une couleur lâchée sur une page ou un texte, et ce qui va avec)

**Statut** : sur la branche `feat/mise-en-page-palette` (vague 2 du 16/11, T-209 second temps), poussée, pas encore fusionnée.
Règles R160 à R166 (`docs/reference/REGLES-TRI.md`). Retour de Mathias : « on doit avoir les couleurs qui sont à côté du magazine,
on peut bien la glisser la couleur sur le fond pour que ça vienne vraiment la remplir de manière unie ou sur une typo, et même que
quand on vient remplir l'un ou l'autre ça nous fasse des propositions ».

## Ce qu'elle fait
- Une **palette** en colonne à droite de la planche (et de la couverture) : le nuancier (le combo appliqué en tête), les couleurs
  des photos de la page, les couleurs libres (pipette, roue, celles déjà posées), et la pastille barrée « Retirer ».
- On **glisse** une pastille : lâchée sur une page, elle la remplit en uni (`Planche.fond`) ; lâchée sur un texte, elle le colore
  (`TexteCadre.couleur`). Un simple clic sur une pastille ne fait rien. Pendant le glisser : la page qui va se remplir (un vrai fond
  posé dans la planche, sous les photos et les textes), le texte qui change de couleur, une bulle « Fond · Ocre » au bout du pointeur ;
  Échap annule. La pastille barrée retire le fond d'une page, ou rend au texte la couleur de son gabarit.
- Sur une **double**, la page sous le pointeur (gauche ou droite) ; une double unie se fait en remplissant l'autre page par la
  proposition « Page d'en face » (même couleur). Sur la page 1 et la dernière page (seules), la page est la seule.
- Sur la **couverture**, les textes seulement : elle n'a pas de fond libre (ses dix gabarits portent leurs aplats ; le fond libre de
  la couverture n'est pas fait). La bulle le dit (« Textes seulement »). À coder plus tard : une pièce de fond pour la couverture.
- Juste après une pose, la palette **propose** ce qui va avec (section « Propose », une ligne par proposition : sa cible, sa couleur
  nommée ; un clic l'applique, une entrée d'historique, Annuler la défait) :
  - un FOND posé sur une page : « Texte » (la couleur qui s'y lit à 4,5:1 parmi l'encre, le papier, la nuit ; pour tous les textes de
    cette page, seulement s'il y en a), « Page d'en face » (la sœur du même combo : à l'aplat sourd répond l'aplat clair, le plus grand
    écart de clarté, comme le rythme d'une double), « Page d'en face » (la MÊME couleur : la double unie) ;
  - un TEXTE coloré : « Fond » pour sa page, parmi la sœur de son combo, le papier, la nuit et le trio d'aplats, ce qui se lit avec lui
    (4,5:1 ; 3:1 pour un titre) ; jamais la couleur du texte ni une presque pareille ; au plus trois. Un fond proposé ainsi est un fond
    posé : ses propres propositions suivent (le texte des autres cadres de la page).

## Où
- `src/lib/mise-en-page/editeur/couleurs.ts` : `propositionsApres(m, pose, combos)` (PURE, déterministe), `textesLisibles`,
  `textesDuCote`, `colorerTextes` (le geste de la proposition « Texte »), `REGLAGES_PROPOSITIONS` (4,5:1, « presque pareil » à
  ΔE00 8, « même couleur » à ΔE00 3, au plus 3).
- Le geste `colorerTextes` (plans.ts, types.ts, etat.ts, invariants G1) : plusieurs textes d'UNE planche, une entrée d'historique.
- `[id]/Palette.tsx` (la colonne et le glisser en événements pointeur), `[id]/glisser.ts` (`cibleCouleurSous` : la source « couleur »,
  lecture du DOM : `data-texte` d'un texte, la moitié de `.ed-planche`), `data-texte` posé par `Scene.tsx` et `SceneCouverture.tsx`,
  la place de la colonne dans `EditeurMagazine.tsx` (ni en tri plein écran ni en confrontation), CSS `.ed-pal` (`mise-en-page.css`).
- Le bouton « Fond » du tiroir est **retiré** (la palette le remplace : glisser, pastille barrée, pipette et roue y sont). Archivé :
  `archive/fond-tiroir-2026-11/` (README, extrait). `Nuances.tsx` reste : la ligne de couleur sous un texte qu'on écrit.
- L'export (IDML, PDF) des fonds et des couleurs de texte est celui du lot G : ni `idml.ts` ni `pdf.ts` n'ont bougé.

## Ce qu'elle ne fait pas (dit, pas codé)
- Pas de glisser au clavier : le fond se pose aussi, d'un clic, par la proposition « Page d'en face » ou « Fond » ; le texte
  garde la ligne de couleur sous le texte qu'on écrit.
- Les propositions pour un texte ne regardent pas ce qu'il y a SOUS le texte : un texte posé sur une photo n'est pas éclairci par un fond.
- Un texte « Fond » ne vise jamais « double » : la page où est le centre du texte.
- Les propositions ne sont pas des leçons (la machine n'apprend pas encore de ce qu'on accepte ou refuse).

## Le test
`scripts/verif-mep-palette.ts` (22 vérifications) : pures et déterministes, 2 ou 3 propositions avec cible et nom, le texte proposé se
lit à 4,5:1 (nuit sur le papier, jamais un texte illisible sur un gris moyen), la sœur du combo (en rôle ou en hexa), pas de face sur
une planche seule, le fond d'un texte coloré, un style, le geste `colorerTextes` (une entrée, Annuler, deux planches refusées),
l'application : le texte proposé se lit de vrai sur le fond posé, la double unie. Recette à l'œil : captures
`design-explorations/editeur-lots-2026-11-16/recette/palette/`.

## Historique
16/11 : créée (vague 2, T-209 second temps).
