---
id: T-131
titre: Les photos sans date calées près de leurs voisines de dépôt, en option
etat: en cours
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« Mets une possibilité d'avoir les photos "sans date" qui se calent dans l'ordre d'upload par
rapport aux autres photos, que je puisse retrouver les photos correspondantes autour. »

## Ce que j'ai vérifié
Depuis T-130, hors de l'ordre du dépôt, les sans date ferment la grille et le lot (« Sans
date », dans l'ordre du dépôt). Eloise en a sept ; leurs voisines de dépôt sont à l'autre bout
de la grille, et rien ne relie une capture sans EXIF à la soirée dont elle vient.

## Ce que je propose
Un troisième bouton, « Sans date : voisines », visible seulement hors de l'ordre du dépôt et
s'il y a au moins une sans date ET une datée. Enfoncé, chaque sans date emprunte la date de
la photo datée déposée juste avant elle (sinon celle déposée juste après) POUR SE RANGER
seulement : en « Par date » elle suit sa voisine, en « Par lieu » elle entre dans son séjour et
le groupe « Sans date » disparaît. La vignette reste sans date. Relâché : en queue, comme
avant. Le lot suit (règle T-128), la route reçoit `sansDate: "voisines"`.

## Ce qui a été fait
22/09/2026, branche `feat/sans-date-voisines`. **PR #209 fusionnée le 22/09, EN PROD** (déploiement READY du premier coup, alias bellajour.fr vérifié).
- `lot.ts` : `CaleSansDate`, `lireCaleSansDate`, `envelopper` (la date empruntée vit dans une
  enveloppe, jamais sur la photo), `groupesDuLot` (la fiche et le lot voient les MÊMES groupes),
  `ordonnerLot(photos, ordre, cale)`.
- Route du lot : lit `sansDate`.
- `Fiche.tsx` : état `caleSansDate`, bouton, `groupesDuLot` à la place de `grouperParLieu`.
- La sans date emprunte aussi le LIEU de sa voisine quand elle n'en a pas : c'est ce qui la fait
  entrer dans le bon séjour quand elle emprunte à la photo déposée après elle.
- Harnais : 8 assertions sous « T-131 », TOUT PASSE. tsc, lint (0 erreur), build verts. Prouvé
  sur le lot réel d'Eloise (build local, lecture seule) : la photo déposée après une du 14 juillet
  se range au milieu du 14 juillet, celle déposée après Lisbonne 3 août juste derrière.
