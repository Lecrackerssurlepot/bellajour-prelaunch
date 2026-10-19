---
id: T-171
titre: Une photo dont la vignette a échoué s'affiche dans la grille en original, et rien ne refait la vignette
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/api/collectif/photos/route.ts:127` sert l'original quand la vignette manque ; le PUT
  de la vignette est best-effort (`src/app/edition/_composants/depot/moteur.ts:430`) et rien ne la
  régénère côté serveur (le rattrapage `collectif-heic-rattrapage.ts` ne vise que les HEIC).
- 19/10, lecture seule : **28 photos d'édition sur 879 n'ont pas de vignette** (toutes dans des
  éditions d'essai, archivées). Une page de grille montre 120 vignettes : chaque original y pèse
  plusieurs Mo au lieu d'une vingtaine de Ko.

## Ce que je propose
Un rattrapage côté serveur à la confirmation (comme les HEIC), ou un script idempotent sur le
modèle de `vignettes-rattrapage.ts` ; en attendant, la fiche montre déjà le compte
(`sansVignette`).

## Ce qui a été fait
Rien encore.
