# C02 · Piles : rafales, doublons, similaires

**Règles** : R74 à R77, R93 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Une **rafale** = même personne, photos qui se suivent de près avec des empreintes proches. Un **doublon** = empreintes presque identiques, quelle que soit l'heure. Rafales et doublons se fondent en PILES : la plus nette dessus, « +n » pour ouvrir. **Similaires** = même scène, autre cadrage : un tag, jamais une pile.

## Réglages
`rafale_secondes`, `rafale_proche_hamming`, `rafale_large_secondes`, `rafale_hamming`, `doublon_hamming`, `similaire_hamming`, `similaire_minutes`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/mesures.ts` (`lireMesures`), `editeur/bibliotheque.ts` (ce qui se montre), `[id]/Pile.tsx`

## Test
« couche 1 … (R72 à R77) » ; « la lecture visible (R93, R94) ». Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
`pile_autre_gardee`, `pile_pas_un_doublon`, `tete_ecartee`

## Limites connues
La tête d'une pile est la plus NETTE, pas la plus belle (expression, yeux, geste) : c'est la place de la future couche « sélection dans une rafale ». Deux appareils d'un même déposant à la même seconde ne font pas une rafale (essai du 09/11).

## Historique
09/11 : créée. 10/11 : aucune rafale ni doublon vus → 60 s / 16 bits, doublon 8 bits, similaires ajoutés.
14/11 (lot F, R140) : 11 rafales manquées au contrôle à l'œil des six lots → deux photos qui se suivent à 30 s et 20 bits sont une rafale, un cadre tourné ajoute 4 bits ; rejeu : 62 paires vraies sur 83 au lieu de 57. Les rafales de la lecture IA deviennent des piles qui priment (R145, C14).
