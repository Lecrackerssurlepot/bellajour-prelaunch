---
id: T-185
titre: Dans la fiche d'une édition, les onglets ne sont pas bâtis comme la vue d'ensemble et paraissent brouillons
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Actuellement, j'ai créé une édition. Je trouve qu'au niveau de l'atelier, déjà, les différents
onglets ne sont pas très propres à l'intérieur, comme pourrait l'être le dashboard, qu'il est
actuellement bien. » (19/10/2026)

## Ce que j'ai vérifié (19/10, code et CSS, aucune capture)
- La vue d'ensemble (`admin/collectif/[id]/page.tsx:182-317`) est en cartes `eca-carte`
  (titre 24 px, vignettes de couverture ou palette, puces `eca-puce--*`, grand chiffre
  `eca-chiffre`, mosaïque de 4 photos, bulle du dernier message).
- Les huit autres panneaux sont en `ate-carte` (l'autre famille, celle des particuliers :
  titre 20 px/500, rayon 24 px contre 26 px) :
  - Magazines : cinq `<span>` nus (« Palette », « Typographies : »…, `:400-424`), aucune
    vignette ni puce, alors que la vue d'ensemble les a pour les mêmes magazines ;
  - Photos (`PanneauCollecte.tsx`) : lignes libellé/chiffre, aucune vignette ;
  - Réglages et liens : TOUT `FormulaireEdition` dans une carte qui contient cinq
    `fieldset.eca-fieldset` bordés : des cartes dans une carte ;
  - séparateurs `border-bottom` sur `eca-mag-liste li`, absents de la vue d'ensemble.
- Styles en ligne : `PanneauCollecte.tsx:112,129`, `PanneauDocuments.tsx:78`,
  `PanneauGestes.tsx:141,189`. Code mort : le mode `compact` de `PanneauLiens.tsx:51-77`,
  appelé par personne.
- « Le dashboard » : la vue d'ensemble de la fiche est le candidat le plus probable (c'est le
  seul onglet en cartes) ; le mot n'existe dans le code que pour le tableau de bord CLIENT.

## Ce que je propose
Planche 7 du canevas du 19/10 : une seule famille de cartes (`eca-carte`) pour toute la fiche ;
Magazines = une carte par magazine (couverture, état en pastille, brief en images) ; Photos =
grands chiffres, mosaïque, personnes, sélection du client (T-182) ; Réglages = les six étapes de
la création (T-186), sans cadre dans un cadre ; retirer les styles en ligne, archiver le mode
`compact` mort. Comparer chaque onglet à la maquette POINT PAR POINT (mémoire du 15/10).

**À préciser par Mathias** : le « dashboard » est-il bien la vue d'ensemble de la fiche ?

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 7 telle quelle. Le « dashboard » est la vue d'ensemble de la fiche (ma recommandation).

## Ce qui a été fait
Rien encore (maquette seulement).
