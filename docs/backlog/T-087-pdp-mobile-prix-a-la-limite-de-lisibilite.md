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
