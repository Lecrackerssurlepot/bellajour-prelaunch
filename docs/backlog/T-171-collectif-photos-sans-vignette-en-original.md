---
id: T-171
titre: Une photo dont la vignette a échoué s'affiche dans la grille en original, et rien ne refait la vignette
etat: en cours
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/api/collectif/photos/route.ts:127` sert l'original quand la vignette manque ; le PUT
  de la vignette est best-effort (`src/app/edition/_composants/depot/moteur.ts:430`) et rien ne la
  régénère côté serveur (le rattrapage `collectif-heic-rattrapage.ts` ne vise que les HEIC).
- 19/10, lecture seule : **28 photos d'édition sur 879 n'ont pas de vignette** (toutes dans des
  éditions d'essai, archivées). Une page de grille montre 120 vignettes : chaque original y pèse
  plusieurs Mo au lieu d'une vingtaine de Ko.

## Ce que je propose
Un rattrapage côté serveur à la confirmation (comme les HEIC), ou un script idempotent sur le
modèle de `vignettes-rattrapage.ts` ; en attendant, la fiche montre déjà le compte
(`sansVignette`).

## Ce qui a été fait
- PR #271 (19/10, en production) : une vignette perdue pendant une coupure est renvoyée (4 essais,
  `moteur.ts:756-765`) ; banc : 4/24, 4/12 et 24/24 vignettes perdues → aucune.
- Reste : après 4 échecs, la grille sert l'original (`photos/route.ts:132-135`) et rien ne refait
  la vignette côté serveur.
- 20/10 (lot a1, non fusionné) : **le serveur fabrique la vignette qui manque**
  (`src/lib/collectif/rattrapageVignettes.ts`), dans le même passage que la confirmation :
  `depot/complete` après sa réponse et AVANT la lecture des métadonnées (l'empreinte se lit sur la
  vignette), et le rattrapage de T-194 (les retrouvées d'abord, puis les autres photos confirmées
  sans vignette). 320 px, JPEG qualité 72, orientation EXIF appliquée (les jumeaux de
  `reduire.worker.js`). Les OCTETS décident : sharp pour JPEG, PNG, WebP ; libheif-js 1.19.8 en
  Node (la méthode de `collectif-heic-rattrapage.ts`), chargé à la première photo HEIC seulement
  (morceau à part dans le build). La vignette au coffre AVANT la clé en base, la clé seulement si
  elle est encore vide. Borné : 24 sharp et 6 HEIC par passage, une échéance de 40 s ; une photo
  illisible n'est pas retentée aux passages suivants (`impossibles` au journal). Preuve locale :
  JPEG 4000 × 3000 orienté → 240 × 320 droit ; un vrai HEIC de 2125 × 2833 → 240 × 320 en 616 ms.
- Reste : voir arriver une vraie vignette fabriquée en production ; le libellé « sans aperçu
  (HEIC) » de la fiche (`PanneauCollecte.tsx`, `[id]/page.tsx`) n'est plus juste (une photo sans
  vignette n'est plus forcément un HEIC), non touché.
