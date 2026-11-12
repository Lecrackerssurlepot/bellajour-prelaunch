# C01 · Mesures : netteté, empreinte, lumière

**Règles** : R72, R73 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Chaque vignette (320 px, la moyenne à défaut) est lue dans le navigateur, ramenée à 256 px en gris. Netteté = variance du laplacien 3 × 3, jugée sur la deuxième meilleure case d'une grille 4 × 4 (un fond flou ne condamne pas un sujet net). Empreinte = dHash 64 bits. Lumière = gris moyen et parts bouchées ou brûlées. Une photo est **floue** sous le plancher absolu, ou sous une part de la médiane de l'album dès assez de mesures ; une photo de nuit n'est jugée que sur le plancher.

## Réglages
`flou_absolu`, `flou_relatif`, `flou_min_mesures`, `flou_nuit`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/mesures.ts` (pur), `[id]/mesuresClient.ts` (lecture dans le navigateur, IndexedDB `bj-mep-mesures`)

## Test
« éditeur : couche 1, floues, rafales et doublons en piles (R72 à R77) » ; « la lecture visible (R93, R94) ». Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
`floue_gardee` (une floue gardée ou posée)

## Limites connues
Pas de mesure si la vignette est illisible (la photo reste hors des piles). Un flou de bougé volontaire (filé) se lit comme un flou. Une photo floue mais forte en émotion : la machine ne le sait pas, l'atelier tranche (tag, jamais une exclusion).

## Historique
09/11 : créée (120 et 20 % sur l'image entière). 10/11 : aucune floue vue au test → case 4 × 4, plancher 40, exemption de nuit (recette 2026-11-10).
