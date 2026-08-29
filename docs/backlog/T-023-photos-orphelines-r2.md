---
id: T-023
titre: 734 photos orphelines dorment sur R2
domaine: donnees
gravite: confort
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« Purger les 734 photos orphelines de R2. À faire à froid, jamais pendant une séance de test. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. Le chiffre est à re-mesurer : il date, et le dépôt a tourné
depuis. `src/lib/atelier/r2.ts:255` avale l'échec d'une suppression, ce qui produit précisément
des orphelins.
## Ce que je propose
Un script en deux temps, comme `vignettes-rattrapage.ts` : `--essai` compte et liste sans rien
toucher, puis la suppression réelle sur accord explicite. **Aucune suppression sans que Mathias
ait lu la liste** : une photo de cliente effacée par erreur ne se récupère pas.
Croiser R2 avec la table `photos` — un objet sans ligne est orphelin, une ligne sans objet est un
bug plus grave à signaler séparément.
## Ce qui a été fait
—
