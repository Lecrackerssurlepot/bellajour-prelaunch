---
id: T-064
titre: Trente déclarations de police jamais peintes bloquent le rendu de chaque page
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`src/app/layout.tsx:26-31` — le chunk CSS racine (15 419 octets) est chargé sur `/`, `/magazine`
et `/composer`. **8 597 octets, soit 56 %, sont trente règles `@font-face`** déclarant Cormorant
Garamond 500/600 et DM Sans 400/500/600/700 — des faces que `(atelier)/theme.css:79-80` remplace
par celles de l'atelier, et qu'aucune page du groupe ne peint.
Le `preload:false` de `layout.tsx:23` évite le téléchargement des fichiers, pas celui des
déclarations. Coût modeste en octets, mais trente `@font-face` à analyser dans le CSS bloquant le
rendu, sur chaque page — y compris celle qui est déjà invisible tant que le JS n'est pas là (T-050).
## Ce que je propose
Les polices du layout racine servent les pages hors groupe atelier (admin, légales, ambassadeurs,
merci). Les déclarer là où elles servent plutôt qu'à la racine. ⚠️ Vérifier que les huit pages
crème gardent leur rendu : c'est un changement de portée, pas de valeur.
## Ce qui a été fait
—
