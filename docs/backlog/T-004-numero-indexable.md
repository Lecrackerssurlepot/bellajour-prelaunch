---
id: T-004
titre: La page d'état de la cliente est indexable par Google
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/app/numero/[token]/page.tsx:170` — la page ne déclare **pas** `robots: { index: false }`.
`src/app/robots.ts` n'exclut que `/api/`. Toutes les pages `/admin/*` déclarent leur `noindex`,
`/composer` aussi. Celle-ci non.
La page porte le prénom de la cliente, le titre de son numéro, ses aperçus et l'état de sa
commande. Le token de 32 caractères la protège du hasard, mais rien n'empêche son indexation si
l'URL fuite une fois (barre d'adresse partagée, extension, capture postée).
## Ce que je propose
Ajouter `robots: { index: false, follow: false }` aux metadata de la page, et `disallow: /numero/`
dans `robots.ts`. Deux lignes, aucun effet visible.
## Ce qui a été fait
—
