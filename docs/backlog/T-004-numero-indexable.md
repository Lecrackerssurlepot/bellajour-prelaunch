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
**31/08/2026 — INFIRMÉ, avec une décision motivée sur le second point.**
Le défaut n'existe pas (ou plus) dans le code :
- `src/app/numero/layout.tsx:43` : `robots: { index: false, follow: false, nocache: true }`,
  posé sur tout le segment `/numero` — la page 404 comprise.
- `src/app/numero/[token]/page.tsx:172` : `robots: { index: false, follow: false }`, présent
  depuis le commit de création de la page (`d8b32ba`, vérifié par `git log -S "index: false"`).
Preuve à l'exécution (build du 31/08, `next start`) : `GET /numero/<token bidon>` sert
`<meta name="robots" content="noindex, nofollow, nocache"/>`.
**`disallow: /numero/` dans robots.ts : volontairement PAS ajouté.** Un Disallow empêche Google
de crawler la page, donc de LIRE le noindex : une URL fuitée pourrait alors apparaître en
« indexée malgré robots.txt », URL nue dans l'index. Le noindex seul est la protection la plus
forte ; les combiner l'affaiblit.
Au passage (T-009) : la page héritait d'un `canonical → https://www.bellajour.fr` posé dans le
layout racine — signal contradictoire avec son noindex, retiré le 31/08.
À signaler hors ticket : `/admin` (le dashboard racine, `src/app/admin/page.tsx`) n'a AUCUN
metadata robots, contrairement à toutes les autres pages admin. Non touché ici (hors périmètre).
