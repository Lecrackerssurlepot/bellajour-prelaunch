---
id: T-162
titre: Next.js 16.2.3 et cinq autres dépendances portent des failles connues, dont des contournements du middleware
etat: en cours
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
- 19/10 : PR #250, `/admin` se garde seul (réduit le risque des contournements du middleware).
- 19/10 : **Next.js 16.2.3 → 16.4.2**, seul (le verrou ne bouge que pour Next et ses propres
  paquets : `@next/*`, `@swc/helpers`, sa copie de sharp ; postcss et nanoid corrigés au
  passage). `npm audit --omit=dev` : de 7 paquets (1 critique, 5 hauts, 1 modéré) à 3 hauts.
  `eslint-config-next` reste en 16.2.3 : la 16.4.2 tire `eslint-plugin-react-hooks` 7.1.1, dont
  la règle plus stricte lève 6 erreurs dans du code inchangé (T-178).
  Vérifié : tsc, lint (0 erreur), build, les deux harnais, onze pages chargées dans Chrome sans
  erreur (accueil, page produit, questionnaire, CGV, compte, Retrouver, atelier, démo, éditions,
  styles, nouvelle édition). L'écart de rendu React sur `/admin` (graphique des inscrits)
  existait déjà en 16.2.3 (rejoué) : sans lien avec la mise à jour.
- Reste : **pdfjs-dist** (avec sa copie `public/pdfjs/`, puis rejouer le contrôle des bords
  T-121), **sharp** 0.35.5 (scripts d'images), **source-map-js** (outillage).
- 20/10 : les trois, chacun seul dans le verrou, installés avec `--before=2026-10-06` (rien de
  publié depuis moins de deux semaines n'entre, sous-dépendances comprises).
  - **pdfjs-dist 5.7.284 → 6.4.299** (dernière 6.x, publiée le 03/10), ÉPINGLÉE à la version
    exacte ; sa dépendance facultative `@napi-rs/canvas` (et ses binaires) 0.1.100 → 1.0.10.
    `public/pdfjs/` recopié depuis `node_modules/pdfjs-dist/build` (octets identiques).
    pdf.js 6 a retiré `PDFDocumentProxy.destroy()` (tsc l'a vu) ; en 5.x il ne faisait que
    `return this.loadingTask.destroy()`, d'où `doc.loadingTask.destroy()` dans
    `rendreBords.ts` (contrôle des bords, T-121) et `rendreTour.ts` (BAT des éditions).
    Prouvé en A/B dans Chrome headless : le MÊME code des deux modules (empaqueté depuis le
    dépôt), un PDF inventé de 4 pages, servi une fois avec pdf.js 5.7.284 et une fois avec
    6.4.299 sous la CSP du site : remarques de bords identiques (page 2 « ne déborde que de
    1,8 mm » à droite, page 3 « presque » à gauche, pages 1 et 4 muettes), rendu du BAT identique
    (empreintes, mots lus, somme des gris de chaque page), aucune violation de CSP dans la page
    ni dans le worker.
  - **sharp 0.34.5 → 0.35.5** (libvips 8.17.3 → 8.18.7) ; la copie de sharp que Next portait
    déjà (0.35.5) se confond avec celle de la racine ; `semver` de sharp 7.7.4 → 7.8.5 (le sien).
    A/B des gestes de `src/lib/atelier/enrichissement.ts` (`lirePhoto` réel compris) et de ceux
    des scripts d'images (`resize` inside/outside, `webp` effort 6, `extract`, `png`, `jpeg`,
    pixels bruts RGBA) sur un JPEG, un PNG et un WebP : sorties identiques, gris 32 × 32 au bit
    près, mêmes empreintes. Aucun script lancé (plusieurs écrivent en production) ; les `.ts` de
    `scripts/` passent `tsc`.
  - **source-map-js 1.2.1 → 1.2.2**, la seule ligne du verrou qui bouge.
  - `npm audit --omit=dev` : de 4 (1 modéré, 3 hauts) à **1 modéré**, `baseline-browser-mapping`
    2.10.18 (dépendance de `next` et de `browserslist`, outillage), hors de ce lot.
  - Harnais (`verif-atelier.ts`) : pdfjs-dist épinglé = version installée = copie servie, octet
    pour octet (prouvé en remettant l'ancien worker : KO).
- Reste : **baseline-browser-mapping** (modéré, `npm audit fix` le monte en 2.11+), et
  `eslint-config-next` 16.4.2 (T-178).
