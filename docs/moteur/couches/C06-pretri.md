# C06 · Pré-tri avec raisons, objectif, équité

**Règles** : R84 à R87, R89 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Un seul geste « Pré-trier » pose les marques proposées sur les photos SANS marque, chacune avec sa raison en quelques mots. Écartée : sous une pile, floue, sombre, brûlée. Réserve : capture probable, visage flou. **Gardée seulement si l'objectif du tri est fixé** : réparti entre les moments selon leur importance, puis les meilleures ET différentes dans chaque moment ; chaque personne et chaque groupe reçoit au moins sa meilleure photo.

## Réglages
`moment_deposant`, `variete_lambda` (+ ceux de C01 à C03). Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/pretri.ts`

## Test
bloc du lot 3 « la machine propose » dans `verif-mep-editeur.ts`. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
`pretri_renverse` (avec sa raison), `reponse` (aux trois questions de fin d'export)

## Limites connues
Tri et sélection sont deux étapes : le pré-tri juge le goût et les défauts ; la sélection pour la mise en page (combien garder d'une rafale) est la couche à venir. Qualité sans IA : netteté, visages, lumière, cœur du client.

## Historique
09/11 : créée.
