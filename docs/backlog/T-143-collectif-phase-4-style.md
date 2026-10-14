---
id: T-143
titre: Le responsable ne peut pas choisir le style de ses magazines
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« Je veux pouvoir ouvrir de vraies éditions de test et tout utiliser de bout en bout (phases 0 à
6). »

## Ce que j'ai vérifié
Maquettes `Styles.dc.html` et `StyleDetail.dc.html`. Le brief vit dans `collectif_magazines`
(`style_id`, `palette_cle`, `doubles`, `texte`, `couvertures_aimees`, `brief_valide_le`).
`couvertures_aimees_max` est un réglage de l'édition, `null` tant que l'atelier ne l'a pas saisi.

## Ce que je propose
PRD §4.2, phase 4 :
- le mur (filtres Tout, Couvertures, Typographies, Palettes, Doubles pages ; bascule de magazine ;
  tags translucides « Sélection du magazine 1 » ; brief à droite avec des liens qui mènent au bon
  endroit ; « Reprendre le style du magazine 1 ») ;
- la page d'un style (fil d'Ariane, couverture recolorée en direct, palette, texte et typos,
  1 à 5 doubles pages, couvertures aimées plafonnées, barre « Choisir … pour le magazine N ») ;
- validation du brief, « Passer au magazine 2 » ;
- **la règle de Mathias écrite à l'écran** (mur, page d'un style, panneau des couvertures) :
  « dans un magazine, tout l'intérieur suit le style choisi ; seule la couverture peut venir d'un
  autre style » ;
- côté atelier : le brief lisible sur la fiche.

**Recette** : un brief complet pour deux magazines, dont une couverture aimée d'un autre style.

## Ce qui a été fait
13/10/2026, branche `feat/collectif-phases-2-a-6` :
- **`brief.ts`** (pur) : la règle de Mathias tenue par le code (palette, texte, doubles pages
  viennent du style choisi ; les couvertures aimées de n'importe quel style publié), les trois
  parts de texte de la maquette, le plafond `couvertures_aimees_max` (null = refusé, jamais
  deviné), le brief figé après la clôture, la visibilité par public (école, entreprise, tous).
- **`/api/collectif/brief`** : choisir, aimer une couverture, valider, rouvrir, reprendre le
  style d'un autre magazine. Responsable seulement (403 pour l'équipe), 409 après la clôture.
  Changer un brief validé le remet « à valider ».
- **Le mur** `/edition/[t]/style` (filtres Tout, Couvertures, Typographies, Palettes, Doubles
  pages ; un onglet par magazine ; tag « Sélection du magazine N » ; brief à droite dont chaque
  ligne mène à l'endroit où elle se règle ; « Passer au magazine N → », « Reprendre le style du
  magazine N ») et **la page d'un style** `/style/[slug]?m=N` (fil d'Ariane, 1 la palette, 2 le
  texte, 3 les doubles pages, les couvertures de ce style, barre fixe « Choisir … pour le
  magazine N » qui dit ce qui manque). La règle intérieur / couverture est écrite à l'écran.
- **Côté atelier** : le brief lisible sur la fiche (style, palette en bandes, texte, doubles,
  couvertures aimées en vignettes, date de validation).
- ⚠️ La maquette recolore la couverture en direct ; nos couvertures sont des images déposées :
  on montre la palette à côté, on ne repeint pas une image.
- **Prouvé en local contre la production (13/10)** : brief incomplet refusé en nommant ce qui
  manque, choix et validation, couvertures aimées, reprise pour le magazine 2, lien d'équipe en
  403, tableau de bord « Vos styles sont choisis », fiche atelier lisible.
- **Reste** : la recette de Mathias avec un vrai style (le style « Essai technique Claude »,
  publié pour la recette, est à retirer du mur dès qu'un vrai style existe).
