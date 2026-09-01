---
id: T-009
titre: Aucune page n'a de canonical
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
Zéro `alternates.canonical` dans tout le dépôt. Et `src/app/sitemap.ts:60` affirme en commentaire
que `/remboursement` « a son canonical » : c'est faux.
Le site répond sur `bellajour.fr` et `www.bellajour.fr`, et cinq redirections pointent vers `/`.
Sans canonical, Google choisit lui-même la version de référence.
## Ce que je propose
Poser `metadataBase` + `alternates.canonical` dans le layout racine, et le laisser se dériver par
page. Vérifier ensuite sur les six URL du sitemap. Corriger le commentaire menteur au passage.
## Ce qui a été fait
**31/08/2026 — l'essentiel était déjà fait ; un défaut induit par ce correctif a été réparé.**
Constat : les canonicals existent désormais, committés, sur TOUTES les pages publiques
indexables — `/` et `/magazine` (relatifs, résolus par `metadataBase`), `/cgv`,
`/confidentialite`, `/mentions-legales`, `/remboursement`, `/ambassadeurs`,
`/ambassadeurs/charte` (absolus). `metadataBase` est posé (`src/app/layout.tsx:53`). Le
commentaire de `sitemap.ts` sur `/remboursement` est devenu vrai (`remboursement/page.tsx:9`).
Défaut restant, corrigé le 31/08 : le layout racine portait AUSSI
`alternates.canonical: 'https://www.bellajour.fr'`. Next hérite ce champ page par page : toutes
les pages SANS canonical propre — c'est-à-dire précisément les pages en noindex (`/merci`,
`/inviter`, `/numero/<token>`, `/composer`, l'admin) — déclaraient l'accueil comme version de
référence tout en demandant à ne pas être indexées. Signaux contradictoires. Retiré du layout
(`src/app/layout.tsx`, commentaire posé) ; chaque page indexable garde son canonical explicite.
Preuves (build + `next start` du 31/08) : `/` → `<link rel="canonical"
href="https://www.bellajour.fr"/>`, `/magazine` → `.../magazine`, `/ambassadeurs` →
`.../ambassadeurs` ; `/merci`, `/inviter`, `/composer`, `/numero/<token>` → noindex et PLUS
AUCUN canonical. `/composer` reste sans canonical à dessein : il est en noindex.
