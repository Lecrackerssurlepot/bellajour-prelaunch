---
id: T-029
titre: Deux avertissements de lint traînent depuis le lot 7
domaine: exploitation
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
« Deux lints pré-existants, hors périmètre du lot 7. »
## Ce que j'ai vérifié
`src/app/admin/page.tsx:145` — `Date.now()` appelé pendant le rendu.
`src/app/api/waitlist/route.ts:181` — `randomCode` déclaré et inutilisé.
Effet : aucun sur la cliente. Mais un lint qui n'est jamais vert habitue à ignorer sa sortie, et
c'est ce qui rend T-010 inutile si on ne le fait pas d'abord.
## Ce que je propose
Les corriger avant de brancher la vérification automatique (T-010), pour partir d'un lint vert.
## Ce qui a été fait
**Rien — le ticket était déjà réglé.** Vérifié le 29/08/2026 : `npm run lint` sort en code 0, le
`Date.now()` de `src/app/admin/page.tsx` a été remplacé (un infini qui DIT la règle au lieu de la
simuler, avec le commentaire qui l'explique), et `randomCode` n'existe plus dans
`src/app/api/waitlist/route.ts`.
Corrigé par une session parallèle avant que je n'y touche. Fermé sans travail : un ticket infirmé
est un gain.
