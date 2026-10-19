# Le formulaire d'une édition avec les champs du navigateur (archivé le 19/10/2026)

`FormulaireEdition.tsx` tel qu'il était à la fin du 19/10 (T-186, planche 5), AVANT les
planches 9, 10 et 11 du 19/10 au soir (T-189, T-190), validées par Mathias :

- les dates passaient par le calendrier du NAVIGATEUR (`<input type="date">` pour la clôture et
  la livraison, `<input type="time">` pour l'heure de clôture), et « Dates de l'événement » était
  un texte libre sans calendrier ;
- les chiffres étaient des `<input type="number">` (les flèches du navigateur) ;
- on ne retirait que le DERNIER magazine (« Retirer le dernier »), sans jamais renuméroter ;
- le message d'accueil des participants ne disait pas où il s'affichait.

Remplacé par :

- `src/app/admin/collectif/Calendrier.tsx` (le calendrier Bellajour, plage ou jour) et ses règles
  pures dans `src/lib/collectif/calendrier.ts` (`grilleMois`, `textePlage`, `lirePlage`…) ;
- `src/app/admin/collectif/Pastille.tsx` (« − 30 photos par personne + ») ;
- `src/app/admin/collectif/ListeMagazines.tsx` (une poubelle par magazine), la règle dans
  `planMagazines` / `retraitMagazine` (`src/lib/collectif/saisie.ts`) ;
- `src/app/admin/collectif/ApercuDepot.tsx` (la page des participants en petit).

L'heure de clôture ne se tape plus : elle reste 23 h 59 heure de Paris (raccourcis et calendrier),
et une clôture existante à une autre heure (« Clore maintenant ») garde son heure quand on change
le jour. `collectif-extrait.css` garde les règles de `collectif.css` devenues sans usage.

Rien n'importe ces fichiers : `archive/` est hors du compilateur (`tsconfig.json`) et du lint.
