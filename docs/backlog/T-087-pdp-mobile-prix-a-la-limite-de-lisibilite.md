---
id: T-087
titre: Sur téléphone, le prix de la PDP est compressé à la limite de la lisibilité
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-09-01
---
## Ce que Mathias a dit
« La PDP, sur téléphone je la trouve encore un peu trop dense. » (01/09/2026)

## Ce que j'ai vérifié (audit front 01/09)
La densité du premier écran est un choix **délibéré et documenté** : `pdp.css:148-159` et `:656-658`
mesurent toute la composition (mot, collage, titre, prix, CTA, 2 gages) au pixel pour tenir **sans
défilement**. Les 3 cartes de prix restent forcées en 3 colonnes sous 720 px (`pdp.css:693-696`),
avec `.combien` à `font-size:10px` (`:704`) et `.pages` à `11px` (`:706`). Un prix à 10-11 px sur une
carte de ~104 px de large (commentaire des auteurs, `pdp.css:679-702`) est à la limite basse de
lisibilité — en particulier pour une audience qui peut inclure des grands-parents commandant un
cadeau. Ce n'est pas un oubli : c'est le compromis « zéro scroll » contre lisibilité.

## Ce que je propose
Deux pistes, **risque FAIBLE** (mesures locales à un breakpoint, aucune dépendance croisée) :
- accepter un tout petit défilement (quelques dizaines de px, déjà assumé sur iPhone SE — `pdp.css:737`)
  pour remonter `.combien`/`.pages` à 11-12 px minimum ;
- ou empiler les 3 cartes en 1 colonne sous ~360 px de large, plutôt que les compresser à l'identique.

⚠️ **Lié à T-072** : les 3 prix affichés sont FAUX/provisoires (`paliers.ts`). Le jour du barème
dégressif, l'affichage du prix sur la PDP change de toute façon — autant traiter la lisibilité à ce
moment-là si Mathias préfère un seul chantier.

## Ce qui a été fait
**03/09/2026 — fait (branche `fix/pdp-prix-lisibilite`).** La première piste, au plus léger et
**sans changer la mise en page** : les deux mentions des cartes de prix remontent au minimum
lisible — `.combien` 10 → 11 px, `.pages` 11 → 12 px (`pdp.css`, bloc `@media max-width:720px`).
Le prix en euros n'a pas bougé : il était déjà grand (8vw), ce n'est pas lui qui manquait de
lisibilité mais les libellés au-dessus et en dessous.

**L'invariant « premier écran jusqu'au bouton » est intact** : les interlignes sont resserrés d'un
cran (`.combien` 1,45 → 1,3 ; `.pages` 1,35 → 1,25) pour absorber la hausse. Mesuré au navigateur
(375×667) : hauteur du bloc prix et position du bouton **identiques au pixel** avant/après (delta 0).

Cas étroits vérifiés : à 360 px `.pages` tient sur une ligne à 12 px ; à 320 px (iPhone SE 2016) il
se repliait **déjà** sur deux lignes à 11 px, donc aucune coupe nouvelle et hauteur inchangée.
`build` vert. **À fermer.** (Le stacking sous 360 px n'a pas été retenu : inutile, et il ajoutait
du défilement pour un gain nul. La refonte T-072 reste indépendante.)
