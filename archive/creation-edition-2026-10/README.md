# Créer une édition avec ce qu'on sait déjà (21/10/2026, planche 7)

Mathias, sur la maquette : « Il y a des cases à remplir pour l'atelier, mais il faut du coup qu'on ait les
infos avant, sinon on ne pourra pas le remplir ! » Validé : quatre champs obligatoires (l'organisation,
l'événement, le NOM et l'e-mail du responsable), « Créer l'édition » dès la première étape, un « Magazine 1 »
d'office, aucun chiffre proposé, et sur la fiche un encart « À compléter ».

## Ce qui est archivé ici

- `FormulaireEdition.avant.tsx` : le formulaire d'une édition (création ET réglages) tel qu'il était sur
  `main` au 21/10/2026, juste avant ce changement. « Créer l'édition » n'existait qu'à la sixième étape (un
  `submit` qui prenait la place de « étape suivante »), l'e-mail et deux noms étaient seuls marqués d'un « * »,
  le nom du responsable était facultatif, un magazine sans nom bloquait (« Chaque magazine a un nom »), le devis
  disait « à fixer ». Remplacé en place par `src/app/admin/collectif/FormulaireEdition.tsx`.
- `alerte-photos-par-personne.tsx.txt` : l'alerte « Photos par personne : à régler » de la vue d'ensemble de
  la fiche (« Le lien des participants reste fermé… »). Elle parlait du LIEN GÉNÉRAL, qui n'est plus montré ;
  elle est remplacée par l'encart « À compléter » (`src/app/admin/collectif/[id]/ACompleter.tsx`, liste pure
  `src/lib/collectif/aCompleter.ts`). La règle qu'elle lisait (`depotRegle`, `plafonds.ts`) n'est PAS morte :
  la page `/depot/[token]` la lit toujours.

Hors du périmètre du build (aucun import, `archive` est exclu de tsconfig et du lint).
