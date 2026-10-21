# « Changer le nom » et « Changer le nombre de photos » d'un lien (20/10/2026 → 21/10/2026)

`Liens.tsx` tel qu'il était sur la branche de travail du 21/10 (main au 21/10, juste avant ce
changement) : l'onglet « Les liens » de la page Photos du responsable, avec ses DEUX gestes séparés
dans le menu « ... » d'une carte de lien :

- « Changer le nom » → `FenetreNom` (une fenêtre, un champ), qui écrivait par `/api/collectif/dossiers`
  (`{ cle: "lien:<id>", nom }`) ;
- « Changer le nombre de photos » → `FenetrePlafond` (une fenêtre, le curseur et ses raccourcis), qui écrivait
  par `/api/collectif/provenances` (`{ action: "plafond", id, plafond | sansPlafond }`) ou, pour le lien
  général, par `/api/collectif/plafond`.

Retour de Mathias, tests du 21/10 (édition d'essai « Recette 1 ») : « Quand on veut modifier, "changer le
nom" et "changer le nombre" cela pourrait être ensemble. »

Remplacés le 21/10/2026 par UN seul geste « Modifier » : `FenetreModifierLien` (dans
`src/app/edition/[token]/photos/Liens.tsx`), une fenêtre avec le nom ET le nombre de photos par personne
(ou « Sans limite »), enregistrés en une requête : `{ action: "modifier", id, libelle, plafond | sansPlafond }`
sur `/api/collectif/provenances`. La décision est `planModificationLien`
(`src/lib/collectif/modifierLien.ts`, pur, au harnais) : le nom comme avant (`lireNomDossier`), le nombre
comme à la création (`lirePlafondLien`, borné par le plafond de l'atelier), un nom déjà pris ou réservé
refusé (409). Le lien général garde le même geste, sans nom ni « Sans limite ».

Ce qui n'est PAS archivé, et reste en service : les deux routes d'avant (`action: "plafond"` de
`provenances`, la branche `lien:` de `/api/collectif/dossiers`). Plus aucun écran ne les appelle ; elles
restent des routes valides (mêmes droits, mêmes règles) tant qu'on n'a pas décidé de les retirer.

Aussi dans `Collecte.tsx` (non archivé, un fichier vivant) : les états `renommer` et `plafond` et leurs
deux fenêtres ont fait place à un état `modifier` et une fenêtre.

Hors du périmètre du build (aucun import, `archive` est exclu de tsconfig et du lint).
