---
id: T-195
titre: Un plafond total laissé vide ferme le dépôt pour tout le monde, et le participant ne l'apprend qu'après avoir choisi ses photos
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

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
Rien encore.
