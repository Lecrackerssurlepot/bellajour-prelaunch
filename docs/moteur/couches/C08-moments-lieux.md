# C08 · Moments, séjours, lieux, faits

**Règles** : R70, R71, R91 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Un **moment** commence à chaque jour ou après une pause, nommé par l'heure de son premier cliché. Un **séjour** change quand la ville change. Les **lieux détaillés** (lieu connu, commune, ville proche, département, région, pays) viennent de Geoapify et sont proposés en écrivant un titre ou une légende ; un texte non écrit montre et exporte le lieu. Les **faits** (jour, moment, heure, nombre de photos, étendue) sont proposés après les lieux.

## Réglages
`PAUSE_MOMENT_MIN` (moments.ts), `RAYON_PRECIS_M`, `RAYON_VILLE_M` (lieux.ts) : pas encore dans `reglages.ts`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/moments.ts`, `editeur/lieuxTextes.ts`, `editeur/faits.ts`, `lib/mise-en-page/lieux.ts`, route `api/admin/atelier/mise-en-page/lieux`

## Test
scénarios « moments » et « lieux » de `verif-mep-editeur.ts` ; faits dans le bloc du lot 3. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
aucune (un lieu remplacé à la main n'est pas encore une leçon)

## Limites connues
Geoapify ne nomme pas un lac depuis la rive. L'heure est celle de l'appareil, sans fuseau. Les réglages de cette couche sont encore des constantes de module : à passer dans `reglages.ts` à la prochaine retouche.

## Historique
09/11 : moments et lieux EN PROD (PR #352). Faits sur la branche.
