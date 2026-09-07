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
**07/09/2026 — lot 5 « barème par tranches de pages » (PR draft `feat/bareme-pages`).**
L'affichage du site s'aligne sur le CODE en attendant l'arbitrage : la source unique
`src/lib/atelier/grille.ts` dit 20-29 / 30-39 / 40-50, et la page produit comme
l'écran 5 du dépôt affichent désormais « 20 à 29 pages » (ils disaient 20-28/30-38,
en contradiction avec ce que `prix.ts` facture depuis le début). Les CGV, elles,
n'ont PAS bougé (interdit nº2) : les textes proposés pour les trois langues sont dans
`docs/produit/PROPOSITION-CGV-LIVRAISON.md` §5.
**Attend Mathias** : 28 ou 29 ? Si 29 → corriger l'annexe des CGV (3 langues + docx).
Si 28 → changer `maxPages` dans `grille.ts` et vérifier qu'aucun numéro n'est à
29 pages. Le ticket reste ouvert jusqu'à l'arbitrage.
