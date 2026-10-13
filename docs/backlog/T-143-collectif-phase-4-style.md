---
id: T-143
titre: Le responsable ne peut pas choisir le style de ses magazines
etat: nouveau
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
Rien. Ticket ouvert le 13/10/2026.
