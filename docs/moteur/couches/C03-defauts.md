# C03 · Défauts : sombre, brûlée, capture, visage flou

**Règles** : R85 (A3, A4, A7), R94 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Une photo **sombre** ou **brûlée** a un gris moyen extrême ET une grande part de pixels bouchés ou brûlés. Une **capture d'écran probable** n'a aucun appareil photo dans son fichier (ou aucune date) et la forme d'un écran. Un **visage flou** : le plus grand visage est bien moins net que la photo. Chaque défaut est un TAG visible et un filtre.

## Réglages
`sombre_moyenne`, `claire_moyenne`, `ecretage_part`, `capture_rapport`, `capture_aplats` (information seule), `visage_flou`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/tags.ts`, `editeur/pretri.ts`

## Test
« la lecture visible (tags, filtre, captures, similaires, chaleur, panneau) (R93, R94) ». Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
`pretri_renverse` quand le pré-tri l'avait écartée ou mise en réserve

## Limites connues
Une capture de tablette n'est pas reconnue. Les yeux fermés ne se voient pas (le détecteur ne lit pas les yeux) : couche IA à venir.

## Historique
09/11 : créée. 10/11 : la capture ne repose plus sur les aplats (des ciels passaient pour des captures).
14/11 (lot F, R141) : 7 exports Snapchat (JPEG 1 : 2,05, sans appareil ni date) pris pour des captures chez marjorie → une capture exige en plus un PNG, ou du texte abondant sur un grand aplat sans visage ; les deux vraies captures des six lots restent trouvées. Une capture lue par l'IA dit ce qu'elle raconte (R146, C14).
