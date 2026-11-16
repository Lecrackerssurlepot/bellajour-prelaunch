---
id: T-211
titre: Sur la couverture, l'éditeur ne montre pas en premier les photos sélectionnées pour la couverture
etat: fermé
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« Et quand je suis sur la couverture, ça serait bien d'avoir les photos correspondant à la couverture, s'il y a une sélection qui a été faite. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- Les étiquettes « couverture » du tri n'apparaissent que dans la vue « choisies » (`Panneau.tsx`, ligne 82). Les mises en avant « Couv. » de la lecture IA sont des repères sur les vignettes, rien de plus.
- Ouvrir la couverture ne réordonne rien dans la barre latérale.
- Constat confirmé.

## Ce que je propose
Quand la couverture est ouverte, la barre latérale met en tête les photos marquées « couverture » au tri et celles que la lecture IA propose (« Couv. »), puis le reste.

**Quand : vague 1.** Couverture ouverte : en tête, les photos marquées « couverture », puis les « Couv. » de la lecture IA, puis le reste. Petit.

## Ce qui a été fait
Le 16/11, vague 1, branche `feat/mise-en-page-vague-1` (pas encore fusionnée).
- Couverture ouverte, la barre latérale commence par un petit titre « Pour la couverture » : d'abord les photos étiquetées
  « Couverture » au tri, puis les « Couv. » de la lecture IA, chacune dans l'ordre habituel ; puis le reste, comme avant, sans
  elles (sans groupement, le reste prend le titre « Les autres »). `candidatesCouverture` et `groupes` (`editeur/bibliotheque.ts`).
- Les filtres valent pour la tête aussi (on range, on n'ajoute rien) ; une candidate rangée sous une pile se montre quand même.
  Pas de bouton « Poser » sur ce groupe (moins de boutons : on glisse une photo sur la couverture).
- Sans aucune candidate, la barre est celle d'avant ; sur une page, rien ne change.
- Harnais : `scripts/verif-mep-vague-1.ts` (bloc T-211, 9 tests).
- Recette locale : Merisa, lecture `lecture-merisa.json` chargée par « Premier jet », une photo étiquetée Couverture : captures
  `03` et `04` (« Pour la couverture 19 » : l'étiquetée, puis les 18 « Couv. »), `05` (sur une page, la barre d'avant).
