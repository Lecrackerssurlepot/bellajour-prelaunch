---
id: T-014
titre: Le sitemap ment sur ses dates
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/app/sitemap.ts:25-27` — `MAJ_ACCUEIL`, `MAJ_LEGALES`, `MAJ_PRODUIT` sont des constantes
écrites à la main. Elles ne bougent que si quelqu'un y pense, donc elles se périment en silence.
## Ce que je propose
Soit les dériver du dernier commit touchant chaque zone, soit les retirer : un `lastModified`
faux est pire qu'absent. Je penche pour le retrait, sauf si Google en tire un bénéfice mesurable
sur un site de six URL — il n'en tire aucun.
## Ce qui a été fait
—
