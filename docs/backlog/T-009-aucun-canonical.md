---
id: T-009
titre: Aucune page n'a de canonical
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
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
—
