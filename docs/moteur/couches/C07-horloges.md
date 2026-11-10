# C07 · Horloges entre téléphones

**Règles** : R88 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Entre deux déposants, des photos jumelles (empreintes très proches) dont l'écart de dates concorde recalent le second sur le premier. Les moments du pré-tri se découpent sur les dates recalées ; la bibliothèque garde les dates d'origine.

## Réglages
`horloge_hamming`, `horloge_paires_min`, `horloge_tolerance_s`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/pretri.ts`, `editeur/mesures.ts`

## Test
bloc du lot 3. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
aucune

## Limites connues
Ne sert que pour les éditions à plusieurs déposants. Jamais vu sur un vrai dossier à ce jour.

## Historique
09/11 : créée.
