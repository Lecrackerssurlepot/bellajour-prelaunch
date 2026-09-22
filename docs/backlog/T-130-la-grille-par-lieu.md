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
22/09/2026, branche `fix/lot-par-date` (avec T-128 et T-129). **PR #206 fusionnée le 22/09, EN PROD** (premier déploiement en ERROR sur la police Google, relancé sans cache par Mathias, READY à 14h06 UTC, alias bellajour.fr vérifié).
- `lieux.ts` : `grouperParLieu` (pur), `SANS_LIEU`.
- `lot.ts` : `OrdreLot` gagne `"lieu"`, `ordonnerLot` met les groupes bout à bout ; la route
  du lot le lit tel quel.
- `Fiche.tsx` : l'état `ordreGrille` (`depot | date | lieu`) remplace `parDate` ; bouton
  « Par lieu » (seulement si un lieu existe) ; titre `.ate-photos-lieu` avant la première
  photo de chaque groupe ; le filet « Ajoutées le » ne s'affiche qu'en ordre du dépôt.
- Harnais : 7 assertions sous « T-130 », TOUT PASSE. tsc, lint (0 erreur), build verts.

## Deuxième passe (22/09/2026, après-midi)
Mathias, après avoir vu la première version en prod : « Je souhaite pouvoir avoir les photos
par lieu mais dans l'ordre chronologique (donc date) et que les photos sans date soient placées
dans l'ordre d'upload. Et que le téléchargement se fasse toujours par rapport à cela ! »

La première passe fusionnait une ville quittée puis retrouvée en UN groupe placé à la première
visite : Lisbonne (mars) contenait aussi les photos d'août, et le fil du temps sautait. Réécrit
en SÉJOURS : les datées par date, un nouveau groupe à chaque changement de lieu (ville, sinon
pays) ; une datée sans lieu ne coupe rien, elle reste dans le séjour en cours et le premier
lieu connu baptise un séjour encore sans nom ; « Sans date » ferme, dans l'ordre du dépôt. Le
titre porte le lieu, le compte et la période (« du 7 au 8 mars 2026 »). Le lot suit, inchangé
dans son principe. Vu sur les vraies données d'Eloise : une photo du 8 août qui ne connaît que le
pays « Portugal » coupait Lisbonne en deux ; règle ajoutée, une photo au pays seul reste dans
le séjour du même pays, et un séjour nommé par le pays prend la première ville de ce pays.
Harnais réécrit : 12 assertions, TOUT PASSE. **PR #207 fusionnée le 22/09, EN PROD**
(déploiement READY du premier coup, alias bellajour.fr vérifié).
