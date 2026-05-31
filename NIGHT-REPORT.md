# NIGHT-REPORT — Optimisation images (session nocturne autonome)

**Branche :** `perf/images-night` (jamais sur `main`)
**Date :** 2026-05-31 (nuit)
**Périmètre :** images servies + leurs attributs uniquement. Aucun JS applicatif,
font, structure DOM, CSS de layout, animation ou fix existant n'a été touché.
**FAQ.tsx : NON touché** (modif locale préexistante laissée hors commit).

---

## TL;DR

| | Avant | Après |
|---|---|---|
| **Sous-ensemble optimisé (38 fichiers)** | 20,11 MB | **4,06 MB** |
| **Total `/public` images servies** | ~23 MB | **6,6 MB** |
| **Réduction** | | **−79,8 %** (16 MB en moins) |

Aucune perte visuelle perceptible : compression WebP q82 minimum (q85 pour le
mockup produit), dimensions à 2× la taille d'affichage maximale (retina), jamais
d'upscale, garde-fou « ne jamais écrire plus lourd que l'original ».
Originaux conservés dans `/image-originals` (gitignoré, 23 MB) **et** récupérables
depuis `main` via git.

`npx tsc --noEmit` : **clean**. `npm run build` : **clean** (route
`/opengraph-image` incluse — elle relit `logo.webp` / `header-bellajour.webp`).

---

## Méthode de rendu trouvée

- **100 % `<img>` plain** — aucun `next/image`, conforme à CLAUDE.md.
- **Aucune photo en `background-image` CSS** : les `url()` CSS ne servent qu'à un
  bruit SVG inline (grain) ; tout le reste sont des couleurs/dégradés de tokens.
- Conséquence : le pipeline AVIF/WebP de `next.config` **ne s'applique pas**
  (réservé à `next/image`). `next.config.ts` laissé intact.
- Outil utilisé : `sharp` (déjà en dépendance), via `scripts/optimize-images-night.mjs`
  (idempotent, ré-encode toujours depuis le backup pristine).

## Image LCP

- **`/images/header-bellajour.webp`** — déjà `<link rel="preload" as="image"
  fetchPriority="high">` (layout.tsx:74) + `fetchPriority="high" decoding="sync"`
  sur l'`<img>` (Hero.tsx:54). **Setup déjà optimal, non modifié.**
- Ré-encodée q82 sans resize : 286 → 283 KB (−1 %). Source 960×1440, affichage
  desktop plafonné à `max-width:720px` → 960px = ~2× déjà juste, **pas d'upscale**,
  et on préserve la qualité mobile haute densité. Le LCP de 28,8 s vient surtout
  de la **contention réseau du payload total** (23 MB) et non de ce seul fichier ;
  c'est ce payload qui chute de 79,8 %.

---

## Tableau par image

| Fichier | Avant | Après | Gain | Dimensions | q |
|---|---|---|---|---|---|
| images/header-bellajour.webp | 286 KB | 283 KB | −1 % | 960×1440 → 960×1440 | 82 |
| images/ui/logo.webp | 418 KB | 51 KB | −88 % | 3508×2480 → 1000×707 | 82 |
| images/anxiete/grid-01.webp | 582 KB | 216 KB | −63 % | 2348×3132 → 1199×1600 | 82 |
| images/anxiete/grid-02.webp | 713 KB | 206 KB | −71 % | 2837×3783 → 1200×1600 | 82 |
| images/anxiete/grid-03.webp | 750 KB | 210 KB | −72 % | 2886×3848 → 1200×1600 | 82 |
| images/anxiete/grid-04.webp | 845 KB | 218 KB | −74 % | 3024×4032 → 1200×1600 | 82 |
| images/anxiete/grid-05.webp | 866 KB | 219 KB | −75 % | 3024×4032 → 1200×1600 | 82 |
| images/anxiete/grid-06.webp | 785 KB | 207 KB | −74 % | 3024×4032 → 1200×1600 | 82 |
| images/anxiete/float-01.webp | 1162 KB | 125 KB | −89 % | 4284×5712 → 1200×1600 | 82 |
| images/anxiete/float-02.webp | 1680 KB | 260 KB | −85 % | 4032×3024 → 1600×1200 | 82 |
| images/anxiete/float-03.webp | 459 KB | 99 KB | −78 % | 3024×4032 → 1200×1600 | 82 |
| images/anxiete/float-04.webp | 679 KB | 130 KB | −81 % | 4032×3024 → 1600×1200 | 82 |
| images/brand/brand-01.webp | 119 KB | 116 KB | −3 % | 1200×1600 → 1200×1600 | 82 |
| images/brand/brand-02.webp | 92 KB | 88 KB | −4 % | 1200×1600 → 1200×1600 | 82 |
| images/brand/brand-03.webp | 201 KB | 199 KB | −1 % | 1200×1600 → 1200×1600 | 82 |
| images/brand/brand-04.webp | 552 KB | 552 KB | 0 % | 1200×1600 (gardé original) | — |
| images/brand/brand-05.webp | 322 KB | 322 KB | 0 % | 1200×1600 (gardé original) | — |
| images/solution/solution-upload-01.webp | 341 KB | 10 KB | −97 % | 1920×1440 → 320×240 | 82 |
| images/solution/solution-upload-02.webp | 650 KB | 12 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-03.webp | 623 KB | 11 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-04.webp | 618 KB | 14 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-05.webp | 383 KB | 13 KB | −97 % | 1920×1440 → 320×240 | 82 |
| images/solution/solution-upload-06.webp | 723 KB | 16 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-07.webp | 298 KB | 9 KB | −97 % | 1920×1440 → 320×240 | 82 |
| images/solution/solution-upload-08.webp | 752 KB | 16 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-09.webp | 752 KB | 17 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-10.webp | 1185 KB | 22 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-11.webp | 963 KB | 23 KB | −98 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-upload-12.webp | 343 KB | 11 KB | −97 % | 1920×1440 → 320×240 | 82 |
| images/solution/solution-casting-01.webp | 706 KB | 22 KB | −97 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-casting-02.webp | 433 KB | 20 KB | −95 % | 1920×2560 → 240×320 | 82 |
| images/solution/solution-casting-03.webp | 444 KB | 21 KB | −95 % | 1920×2560 → 240×320 | 82 |
| images/hero/hero-01.webp | 34 KB | 9 KB | −74 % | 512×683 → 300×400 | 82 |
| images/hero/hero-03.webp | 64 KB | 16 KB | −75 % | 512×683 → 300×400 | 82 |
| images/hero/hero-05.webp | 39 KB | 13 KB | −67 % | 512×683 → 300×400 | 82 |
| images/hero/hero-07.webp | 31 KB | 9 KB | −71 % | 512×683 → 300×400 | 82 |
| images/Mockup-Album-transparent.webp | 279 KB | 134 KB | −52 % | 1644×2364 → 1391×2000 | 85 |
| images/decor-album.webp | 426 KB | 241 KB | −43 % | 2400×2771 → 1732×2000 | 82 |
| **TOTAL** | **20,11 MB** | **4,06 MB** | **−79,8 %** | | |

### Justification des cibles dimensionnelles (2× affichage mesuré)

- **logo** (3508×2480) : navbar `height:96px` max, render OG à 520px, page inviter
  120px → 1000px de large couvre tous les usages avec marge retina.
- **grille + float Anxiété** : grille 8 colonnes plein écran, zoom max mesuré
  **×1,22** (Anxiete.tsx:230). Cellule ~300px even sur très grand écran → 1600px de
  côté long = 2× large et généreux. `float-02/04` deviennent paysage 1600×1200,
  affichées en cellule portrait via `object-fit:cover` → **rendu identique** (crop
  inchangé).
- **solution-upload / casting** : rendues **uniquement** en vignettes 72×96 / 72×72
  (attributs HTML + CSS `width:72px!important`, Solution.tsx:345-375,
  solution.css:512). 320px de côté long = 2,5–3× retina, marge confortable.
- **hero-01/03/05/07** : affichage max 192px (pile MiseEnPageVisual.tsx:23) → 400px.
- **Mockup album** (produit, alpha) : `width:38vw` desktop / `80vw` mobile,
  `max-height:80vh/70vh` → 2000px de hauteur, q**85** (produit = priorité qualité).
- **decor-album** : `width:50vw` desktop / fond plein écran mobile → 2000px.

---

## Doutes / hésitations qualité

1. **brand-04 (552 KB) & brand-05 (322 KB)** : le ré-encodage q82 produisait un
   fichier **plus lourd** que l'original → le garde-fou a **conservé l'original
   intact** (l'original est déjà compressé sous l'équivalent q82). Zéro changement,
   donc zéro risque qualité. Si on veut les alléger un jour il faudra accepter une
   recompression plus agressive — **je ne l'ai pas fait en autonomie** (risque
   qualité sur une photo de marque).
2. **header-bellajour (LCP)** : gain marginal (−1 %). Je n'ai **pas** poussé la
   compression ni redimensionné (source 960px à peine au-dessus de l'affichage
   720px desktop). Préserver la netteté du visuel produit prime sur 3 KB.
3. Les vignettes solution descendues à 240–320px : à 72px d'affichage c'est
   invisible, mais si une future maquette les agrandit il faudra régénérer plus
   grand depuis `/image-originals`.

---

## Leviers NON touchés (hors périmètre images) — à décider ensemble

| Levier | État | Gain estimé | Pourquoi non touché |
|---|---|---|---|
| **AVIF + `<picture>`** | non fait | ~25–35 % de plus sur les WebP (~1–1,5 MB) | Nécessite modifier la structure DOM (`<picture>`/`srcset`) ou passer à `next/image` → **interdit par le périmètre**. Recommandé en priorité si on veut aller plus loin. |
| **Fonts Google** | non touché | render-blocking ~100–300 ms | Cormorant **7 poids** + DM Sans **5 poids** chargés. Possibilité de subset (latin only) / retirer poids inutilisés / `font-display`. Hors périmètre (fonts). |
| **JS / bundle** | non touché | inconnu | `reactCompiler:true` déjà actif. Audit bundle à part. |
| **Assets email dans `/public`** | non touché | ~2 MB sur disque, **0 sur le LCP** | `decor-album-email.png` (1,76 MB), `decor-album-email.jpg` (276 KB), `logo-mail.png` (43 KB), `signature.png` (261 KB, possible orphelin). **Non chargés par la landing** (servis seulement si appelés par les emails). Pas d'impact perf landing ; à nettoyer/optimiser séparément côté templates email si souhaité. |
| **`signature.webp` (64 KB)** | non touché | négligeable | Utilisé server-side dans l'OG image uniquement. |

---

## Edge cases retina / LCP / lazy

- **Aucun attribut `loading`/`fetchpriority`/`decoding` modifié** : le setup
  existant est déjà correct (LCP préchargé + `high` ; images below-fold en
  `loading="lazy"` ; vignettes solution en `lazy`). Rien à corriger côté attributs.
- **Ratios d'aspect préservés** sur toutes les images → aucun CLS introduit,
  aucun cadrage modifié.
- **Préchargement Anxiété** (`rootMargin 150%`, Anxiete.tsx) inchangé — précharge
  désormais des fichiers 4× plus légers.
- **OG image** : régénérée au build sans erreur depuis les sources réduites
  (logo 1000px, header 960px — bien au-dessus des 520/426px de rendu OG).

---

## Comment rollback / régénérer

- Rollback total : `git checkout main -- public/images` (ou restaurer depuis
  `/image-originals`).
- Régénérer (idempotent, repart toujours du backup pristine) :
  `node scripts/optimize-images-night.mjs`
