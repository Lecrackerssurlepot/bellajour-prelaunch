# C11 · Qualité d'impression, contrôle avant export

**Règles** : R68, R90 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Le cadre actif dit sa résolution à l'impression : correcte dès 300 dpi, orange de 200 à 300, rouge « Basse déf. » sous 200. La planche affiche une version haute définition tirée de l'original. Avant l'export : basses définitions, photo floue posée, visage dans le pli, hésitation ouverte, planche vide. Ce sont des remarques, l'export reste possible.

## Réglages
`SEUIL_DPI_CONFORT` (outils.ts) ; 30 % de zone dans le pli pour la remarque. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/outils.ts`, `[id]/hd.ts`, `[id]/ExportFeuille.tsx`, `[id]/exporter.ts`

## Test
bloc du lot 3 (contrôle) ; dpi dans les scénarios de l'éditeur. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
`export` (jalon) ; l'instantané part à l'export (C12)

## Limites connues
La HD dépend du CORS du coffre pour l'adresse de prévisualisation : non prouvé.

## Historique
09/11 : dpi et HD EN PROD (#352). Contrôle avant export sur la branche.
