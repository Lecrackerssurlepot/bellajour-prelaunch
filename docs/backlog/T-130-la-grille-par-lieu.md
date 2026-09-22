---
id: T-130
titre: La grille de la fiche par sous-groupes de lieu, et le lot qui suit
etat: en cours
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« Et la localisation par sous-groupe », juste après avoir demandé le jour sur chaque vignette
(T-129). Il compose dans Canva par destination (la double « Budapest » chez Lara).

## Ce que j'ai vérifié
Le lieu existait en base (T-123 : `lieu_ville`, `lieu_pays`) et dans la phrase de résumé
(`resumeLieux`), mais nulle part sur la grille : seulement dans l'infobulle au survol. Aucun
regroupement possible à l'écran.

## Ce que je propose
Un bouton « Par lieu » à côté de « Par date ». Enfoncé, la grille se coupe en sous-groupes :
un titre par ville (sinon par pays) avec son compte, dans l'ordre où on y est arrivé (première
photo datée), « Sans lieu » en dernier ; dans un groupe, l'ordre du temps. Une ville quittée
puis retrouvée ne fait qu'un groupe : on compose par destination, pas par étape. Le lot
téléchargé suit ce même ordre (règle T-128 : la vignette 03 est le fichier 03). Les deux
boutons s'excluent, et un bouton enfoncé se relâche vers l'ordre du dépôt.

## Ce qui a été fait
22/09/2026, branche `fix/lot-par-date` (avec T-128 et T-129).
- `lieux.ts` : `grouperParLieu` (pur), `SANS_LIEU`.
- `lot.ts` : `OrdreLot` gagne `"lieu"`, `ordonnerLot` met les groupes bout à bout ; la route
  du lot le lit tel quel.
- `Fiche.tsx` : l'état `ordreGrille` (`depot | date | lieu`) remplace `parDate` ; bouton
  « Par lieu » (seulement si un lieu existe) ; titre `.ate-photos-lieu` avant la première
  photo de chaque groupe ; le filet « Ajoutées le » ne s'affiche qu'en ordre du dépôt.
- Harnais : 7 assertions sous « T-130 », TOUT PASSE. tsc, lint (0 erreur), build verts.
