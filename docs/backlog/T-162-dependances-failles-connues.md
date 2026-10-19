---
id: T-162
titre: Next.js 16.2.3 et cinq autres dépendances portent des failles connues, dont des contournements du middleware
etat: nouveau
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
`npm audit --omit=dev` le 19/10 : 7 paquets, 1 critique, 5 hauts, 1 modéré.
- **next 16.2.3** (correctif : 16.4.2) : 30 avis. Ceux qui nous touchent : plusieurs
  contournements du middleware en App Router (GHSA-267c-6grr-h53f, GHSA-26hh-7cqf-hhc6,
  GHSA-492v-c6pp-mqqv, GHSA-6gpp-xcg3-4w24 « Turbopack and single locale »), des dénis de
  service (GHSA-8h8q-6873-q5fj, GHSA-m99w-x7hq-7vfj), une SSRF et une exécution de code dans
  l'optimiseur d'images (GHSA-2xp9-vwfh-vxw4, GHSA-cjq9-62q9-8jv4). Le site n'utilise pas
  `next/image`, mais `/_next/image` répond en production (400 sur une image absente, 19/10) :
  l'optimiseur est exposé.
- Atténué depuis le 19/10 : chaque page de l'admin et chaque route `/api/admin/*` revérifient
  la session elles-mêmes (PR #250 pour la dernière page qui ne le faisait pas), donc un
  contournement du middleware n'ouvre plus rien à lui seul.
- **pdfjs-dist ^5.7.284** (correctif 6.2.108+) : exécution de JavaScript à l'ouverture d'un PDF
  piégé. Rendu côté atelier seulement, sur des PDF déposés par l'atelier ; copié aussi dans
  `public/pdfjs/` (à mettre à jour ENSEMBLE, règle de `src/app/admin/CLAUDE.md`).
- **sharp ^0.34.5** (libvips, libheif, librsvg), **postcss**, **nanoid**, **source-map-js**,
  **baseline-browser-mapping** : outillage ou traitement d'images de nos propres fichiers.

## Ce que je propose
Une PR par saut : Next.js 16.4.2 d'abord (lire les notes de 16.3 et 16.4, build, harnais, recette
des pages publiques, du tunnel et de l'atelier sur la version d'essai), puis pdfjs-dist avec sa
copie `public/pdfjs/` (vérifier le contrôle des bords T-121), puis le reste. Mettre à jour la
ligne « Stack » du `CLAUDE.md` racine.

## Ce qui a été fait
Rien encore (la garde de `/admin`, PR #250, réduit le risque sans le fermer).
