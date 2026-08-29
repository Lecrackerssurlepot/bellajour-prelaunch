---
id: T-016
titre: Les quatre composants de l'ancienne accueil ont fini leur office
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`S1Hero.tsx`, `S2Collection.tsx`, `S3Method.tsx`, `S4Final.tsx` et leurs quatre CSS, dans
`src/app/(atelier)/components/` : **zéro import**. Les seules mentions sont des commentaires.
Leur contenu (l'étagère des quatre numéros, les trois temps, la grille des paliers, l'acte final)
est passé dans `/magazine` depuis le 30/08, et tous lisent `content.ts` — il n'y a donc toujours
qu'une source de texte.
⚠️ Trois fichiers différents portent le nom `S1Hero.tsx` : ici, `archive/preventes/`,
`archive/lancement/`. Vérifier le chemin avant tout `git mv`.
## Ce que je propose
`git mv` vers `archive/accueil-v1/` avec un README. Ils reviennent par un `git mv` inverse.
## Ce qui a été fait
—
