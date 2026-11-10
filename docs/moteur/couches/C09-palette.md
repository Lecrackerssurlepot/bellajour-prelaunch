# C09 · Palette

**Règles** : R92 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Cinq teintes par photo (k-moyennes sur la vignette), six pour le magazine, montrées à côté de la jauge.

## Réglages
aucun réglage nommé. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/mesures.ts`, `[id]/TriBulles.tsx`

## Test
bloc du lot 3. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
aucune

## Limites connues
Pas encore reliée aux aplats ni au choix des gabarits (lot 5).

## Historique
09/11 : créée.
