---
id: T-129
titre: Le jour de prise de vue sur chaque vignette de la fiche, pas seulement en tri « Par date »
etat: en cours
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« Peux-tu afficher en bulle ou en dessous la date sur l'atelier de chaque photo, cela
m'aiderait grandement à travailler. »

## Ce que j'ai vérifié
La date existait déjà sur la vignette (`ate-photo-jour`, voile en haut, T-123), mais
`Fiche.tsx` ne la rendait que sous `parDate && p.priseLe` : dans l'ordre du dépôt, l'éditeur
n'avait la date que dans l'infobulle au survol.

## Ce que je propose
Le jour sur CHAQUE vignette datée, quel que soit l'ordre, dans la forme du nom de fichier
(« 11 juil 2026 », `jourCourt`) : ce que l'éditeur lit à l'écran est ce qu'il cherche dans le
dossier téléchargé. Une photo sans date ne porte rien (la remarque « sans date » reste dans le
résumé, pas sur la vignette).

## Ce qui a été fait
22/09/2026, branche `fix/lot-par-date` (avec T-128). Condition retirée dans `Fiche.tsx`,
`jourCourt` à la place de `jourEnClair` sans année, commentaire CSS et `admin/CLAUDE.md` à jour.
