# C05 · Zone importante, recadrage par le contenu, pli

**Règles** : R82, R83 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
La **zone importante** = les visages avec de l'air au-dessus des têtes, élargis à la masse saillante (résidu spectral 64 × 64) ; sans visage, la saillance seule. Poser une photo la **recadre par le contenu** (même remplissage, l'image glisse pour centrer la zone). Sur une double, un gabarit qui met la zone dans la bande du **pli** est pénalisé.

## Réglages
`air_tete`, `masse_saillance`, `pli_mm` (**HYPOTHÈSE 5 mm, à confirmer avec Cloudprinter**). Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/saillance.ts` (`zoneImportante`, `recadrageParContenu`), `[id]/Chaleur.tsx`

## Test
« lot 2, des yeux » ; R93/R94 pour la carte de chaleur. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
aucune directe ; un recadrage refait à la main n'est pas encore une leçon

## Limites connues
`pli_mm` est une hypothèse : ne pas le présenter comme une mesure. Le recadrage manuel n'est pas touché.

## Historique
09/11 : créée.
