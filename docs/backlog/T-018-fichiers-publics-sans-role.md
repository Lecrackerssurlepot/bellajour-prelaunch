---
id: T-018
titre: Trois fichiers sans rôle sont servis publiquement
domaine: exploitation
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
Accessibles à qui connaît l'URL : `public/preview-anxiete.html` (preview d'une section archivée),
`public/hero.css` (sa feuille, hors du pipeline de build), et
`public/c92a0e44-8808-4b6e-af83-8cd186025fdd.html` (fichier au nom d'UUID, rôle inconnu).
Plus, à la racine du dépôt, `bellajour-atelier-maquette-v2.html` (28 Ko) et des `.DS_Store`
présents dans `src/`, `src/app/`, `src/app/api/`.
Effet : aucun danger identifié, mais ce sont des pages du passé servies sous notre nom de domaine.
## Ce que je propose
Lire le fichier UUID avant tout geste — il peut porter n'importe quoi. Puis déplacer les trois
vers `archive/`, ajouter `.DS_Store` au `.gitignore` et les retirer de l'index.
## Ce qui a été fait
—
