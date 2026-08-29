---
id: T-006
titre: Un album de 29 pages n'est couvert par aucune ligne des CGV
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/atelier/prix.ts:32` code le premier palier `{ minPages: 20, maxPages: 29 }` à 30 €.
`src/app/legal/content/cgv.ts` (FR:247, PT:491, EN:735) écrit « 20 à 28 pages ».
Un numéro de 29 pages est donc facturé 30 € par le code, et n'est décrit par aucune ligne de
l'annexe tarifaire. Le PT fait juridiquement foi.
Effet : faible en volume, mais c'est un écart entre ce qu'on facture et ce qu'on a contractualisé.
## Ce que je propose
Aligner — mais dans quel sens est une décision, pas une correction.
**Question pour Mathias** : le palier va-t-il jusqu'à 28 ou 29 pages ? Si c'est 29, il faut
corriger les trois langues des CGV (et `legal-source/*.docx`, qui a déjà une version de retard).
Si c'est 28, c'est `prix.ts` qui change, et il faut vérifier qu'aucun numéro existant n'est à 29.
## Ce qui a été fait
—
