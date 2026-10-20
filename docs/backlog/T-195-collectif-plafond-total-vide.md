---
id: T-195
titre: Un plafond total laissé vide ferme le dépôt pour tout le monde, et le participant ne l'apprend qu'après avoir choisi ses photos
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

Puis, le 20/10, sur le total : « on ne sait pas forcément combien il y aura ». Le total ne
devient donc PAS obligatoire : vide, il veut dire « pas de limite pour toute l'édition » (D27).

## Ce que j'ai vérifié
- `plafond_total` est facultatif à la création (`src/lib/collectif/saisie.ts:206`, champ
  `FormulaireEdition.tsx:765`).
- Vide, `placeRestante` rend 0 place à tous sauf l'atelier (`src/lib/collectif/plafonds.ts:140`).
- La page de dépôt ne le vérifie pas : le refus tombe à la déclaration, après le choix des photos
  (`src/app/api/collectif/depot/presign/route.ts:140`).
- Les phrases de plafond sont toujours au vouvoiement, même quand l'édition est au tutoiement
  (`plafonds.ts:36-43`).

## Ce que je propose
Exiger le total à la création (ou le refuser à l'ouverture des liens) ; la page de dépôt dit
d'emblée « Le dépôt n'est pas encore ouvert » quand il manque ; les phrases suivent le ton de
l'édition. Harnais.

## Ce qui a été fait
20/10, lot a2 (worktree `agent-a50f52eeeeed6d02d`, non commité) :
- D27 : un total vide = pas de limite pour toute l'édition. `placeRestante` (plafonds.ts) ne
  rend plus `plafond_non_regle` pour un total vide (le responsable et un lien « sans limite »
  n'ont alors plus aucune borne ; un participant garde son plafond par personne ou celui de son
  lien). Le formulaire dit sous la case « Laisser vide : pas de limite pour toute l'édition. »
  et la pastille vide lit « sans limite ». La saisie n'a pas changé (le total reste facultatif).
- Le plafond PAR PERSONNE qui manque (lien général, ou lien sans plafond propre ni « sans
  limite ») ferme toujours le dépôt, mais la page `/depot/[token]` le dit d'emblée, AVANT le
  choix des photos, au registre (`depotRegle`, la règle de `placeRestante` jouée à vide) :
  « Le dépôt n'est pas encore ouvert : le nombre de photos par personne n'a pas été réglé par
  l'atelier. » puis « Garde ce lien : il fonctionnera dès que ce sera fait. » (vous : « Gardez »).
  La fiche de l'atelier l'affiche en alerte ; plus d'alerte pour un total vide.
- Les phrases de plafond suivent le registre (`messagePlafond`, `MESSAGE_PLAFOND_TU`) : la route
  `depot/presign` ne les écrit plus en dur.
- ⚠️ Vu en lecture le 20/10 : l'édition Audencia (« 60 ans », au tu, ouverte jusqu'au 4/11) a
  le total ET le plafond par personne vides. Aujourd'hui en production, tout son dépôt est donc
  fermé (total vide), y compris le lien « Equipe 1 » et le responsable. Avec ce lot : le lien
  « Equipe 1 » (100 par personne) et le responsable déposent ; le lien général reste fermé
  (plafond par personne vide) et le dit avant le choix. À régler dans la fiche si le lien
  général doit servir.
- Harnais : `verif-collectif.ts`, section « LOT a2 » (D27, `depotRegle` contre `placeRestante`
  sur 16 combinaisons, phrases au registre, page, formulaire, fiche).
- Captures (lecture seule, non-GET bloqués) : `d-depot-pas-encore-ouvert-tu.png`,
  `f-fiche-alerte-par-personne.png` dans le scratchpad du lot a2.
- Reste : `src/lib/collectif/CLAUDE.md` décrit encore « un plafond `null` FERME le dépôt » sans
  l'exception du total (texte proposé dans le rapport du lot, non appliqué).
