# C12 · Mémoire : réglages, leçons, instantanés

**Règles** : R78 à R80, R89 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Les seuils sont des réglages nommés et datés, avec une version courte. Un geste de l'atelier contraire à une proposition devient une LEÇON, écrite sans rien demander, avec les réglages en vigueur. À l'export, l'INSTANTANÉ du magazine est figé (mesures, lecture, marques, planches, jamais de pixels) pour rejouer toute règle future. Au plus trois questions après un export.

## Réglages
tous ; version = `versionReglages()`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/reglages.ts`, `editeur/lecons.ts`, `[id]/leconsClient.ts`, route `api/admin/atelier/mise-en-page/lecons`, `scripts/lecons.ts`, migration `supabase/migrations/20261110_mep_lecons.sql`

## Test
bloc du lot 2 « la mémoire » dans `verif-mep-editeur.ts`. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
`floue_gardee`, `pile_autre_gardee`, `pile_pas_un_doublon`, `tete_ecartee`, `pretri_renverse`, `reponse`, `ouverture`, `export`

## Limites connues
**Tables non créées au 10/11** : sans elles la route répond 503 et les leçons restent sur l'appareil (500 au plus). C'est la base de l'entraînement futur : sans migration, rien ne s'accumule.

## Historique
09/11 : créée. 10/11 : migration toujours à appliquer par Mathias. 12/11 : migration appliquée (tables `mep_lecons`, 2 lignes, et `mep_instantanes`, 0 ligne, vues en base) ; fusionnée dans `main` (lot A) ; le jalon et l'instantané partent aussi à l'export PDF (Canva), le jalon dit « export PDF » ou « export IDML ».
