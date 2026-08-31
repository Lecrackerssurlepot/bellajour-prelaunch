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
31/08/2026 — CONFIRMÉ pour les trois fichiers de `public/` : `git mv` vers
`archive/public-orphelins/`, avec README. Le fichier UUID a été lu AVANT le geste : il ne
contient que son propre UUID (36 octets) — signature d'un fichier de **vérification de
domaine** (Brevo/Meta/TikTok, mécanisme « hébergez ce fichier »). ⚠️ Si un service re-vérifie
le domaine et échoue, le remettre dans `public/` par `git mv` inverse ; le README d'archive le
dit. `bellajour-atelier-maquette-v2.html` (racine, gitignoré) déplacé aussi — il reste ignoré,
la règle du `.gitignore` (ligne 60, sans slash) le suit dans `archive/`.
INFIRMÉ pour les `.DS_Store` : déjà dans `.gitignore` (lignes 24 et 48) et absents de l'index
(`git ls-files` ne les liste pas) — rien à retirer, les fichiers disque sont inoffensifs.
