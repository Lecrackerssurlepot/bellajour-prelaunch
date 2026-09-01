---
id: T-016
titre: Les quatre composants de l'ancienne accueil ont fini leur office
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
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
31/08/2026 — CONFIRMÉ (zéro import ; seules mentions : des commentaires). `git mv` des huit
fichiers (4 `.tsx` + 4 `.css`) depuis `src/app/(atelier)/components/` — et UNIQUEMENT de là,
les deux autres `S1Hero.tsx` d'`archive/` n'ont pas bougé — vers `archive/accueil-v1/`, avec
README. Les commentaires qui pointaient vers l'ancien emplacement ont été suivis :
`(atelier)/page.tsx`, `magazine/page.tsx`, `magazine/Corps.tsx`, `magazine/pdp.css` (×3),
et le paragraphe « Ce qui est mort » de `src/app/CLAUDE.md`.
