# C04 · Visages détectés, jamais reconnus

**Règles** : R81 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
MediaPipe BlazeFace tourne dans le navigateur (servi depuis notre origine : `/mediapipe/1.2.2`, `/modeles/`). On garde des BOÎTES en fractions de l'image, jamais une identité. Sans détecteur, la zone importante vient de la saillance seule.

## Réglages
`visage_confiance`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`[id]/mesuresClient.ts`, `Mesure.visages` dans `editeur/mesures.ts`

## Test
« lot 2, des yeux » dans `verif-mep-editeur.ts`. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
aucune directe ; nourrit C03, C05, C06

## Limites connues
Décision à confirmer par Mathias : détecter sans jamais savoir qui c'est (pas de regroupement par personne, contrairement au `casting/` de l'ancien projet). Petits visages de loin peu trouvés (modèle « short range »).

## Historique
09/11 : créée.
