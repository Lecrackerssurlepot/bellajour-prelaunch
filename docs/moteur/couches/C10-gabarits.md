# C10 · Choix du gabarit et sa note

**Règles** : R66, R67, R69, R83 (`docs/reference/REGLES-TRI.md`) · **Branche** : `feat/mise-en-page-couche1-mesures` sauf mention EN PROD

## Ce qu'elle fait
Les gabarits dessinés (annexe + épingles) passent avant les grilles de secours. La note d'un gabarit pour des photos données = somme de (perte + 3 × perte²) par cadre, + une pénalité de répétition, − un petit bonus aux gabarits dessinés, + la pénalité de pli (C05). Les photos gardent leur ordre de lecture (I13, I14). R parcourt la famille choisie (avec ou sans texte).

## Réglages
`POIDS_GRANDE_COUPE` (outils.ts), `PENALITE_PLI` : pas encore dans `reglages.ts`. Valeurs, dates et raisons : `src/lib/mise-en-page/editeur/reglages.ts` (la seule source).

## Code
`editeur/operations.ts` (`noterGabarit`), `editeur/outils.ts`, `editeur/aimant.ts`, `lib/mise-en-page/epingles.ts`, `templates.ts`, `grilles.ts`

## Test
scénarios de pose et de R dans `verif-mep-editeur.ts` ; bloc « gabarits des épingles » de `verif-atelier.ts`. Rejeu sur photos réelles : `npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie>`.

## Leçons produites
aucune : un gabarit refusé avec R n'est pas encore une leçon (à ajouter)

## Limites connues
La note ne lit encore ni les couleurs ni la chronologie. Beaucoup de gabarits = beaucoup à retoucher : la piste est des familles générées (couche à venir).

## Historique
06/11 : familles et aimant (#351). 09/11 : grande coupe pesée plus lourd (#352), pli (branche).
