# Le pré-tri de l'éditeur (09/11/2026 → 16/11/2026)

## Ce que c'était
Le bouton « Pré-trier · N » de la barre Photos de l'éditeur de mise en page (`/admin/atelier/mise-en-page/<id>`), à côté de
la jauge du tri. Un geste posait d'un coup, sur les photos encore SANS marque, la marque que la machine proposait, chacune avec
sa raison en quelques mots (lot 3 du 09/11, fusionné le 12/11 par #356, règles R84 à R88, couches C06 et C07) :
- Écartée : rangée sous une pile (rafale, doublon), floue, trop sombre, brûlée ;
- Réserve : capture d'écran probable, visage flou ;
- Gardée : seulement si l'objectif du tri était fixé, les meilleures et les plus différentes de chaque moment, au prorata de
  l'importance du moment, puis au moins une photo par personne et par groupe ; les horloges des téléphones recalées avant.

| Fichier | D'où il vient |
|---|---|
| `pretri.ts` | `src/lib/mise-en-page/editeur/pretri.ts`, déplacé tel quel (`git mv`) |
| `BoutonPreTri.tsx` | le composant `BoutonPreTri` de `src/app/admin/atelier/mise-en-page/[id]/TriBulles.tsx`, et sa feuille en commentaire |
| `verif-pretri.ts` | ses tests, retirés de `scripts/verif-mep-editeur.ts` (bloc « lot 3 ») et de `scripts/verif-mep-lecture-ia.ts` (R141) |

Hors du périmètre du build : `archive/` est exclu de `tsconfig.json` et d'ESLint, et rien ne l'importe.

## Pourquoi on l'a retiré, le 16/11
Retour de Mathias du 16/11, après la démo du premier jet et la vitrine Merisa : « En ce qui concerne encore le projet pré-trié,
je trouve que ça sert toujours à rien, il y a des trucs que je ne comprends pas. » (ticket T-210). Ses raisons parlaient en
règles (« R74 », « A3 ») et, depuis le lot F (#363, 14/11), la lecture IA propose mieux les mises en avant, les groupes et les
rafales à garder.

Ce qu'il voyait de juste reste visible, sans geste : les ÉTIQUETTES des vignettes et les filtres « Ce que la machine a vu »
(Floue, Doublon, Rafale, Sombre, Brûlée, Capture, Visage flou : `editeur/tags.ts`), les piles qui rangent rafales et doublons
sous la plus nette (`editeur/mesures.ts`), et « Accepter » sur une rafale de la lecture IA.

## Ce qui reste actif ailleurs (et ne part PAS)
- Le type `Proposition` vit désormais dans `src/lib/mise-en-page/editeur/types.ts` : le premier jet (règle `PJ`) et « Accepter »
  une rafale (règle `IA`) posent encore des marques proposées, gardées dans `EtatEditeur.pretri` (le nom du champ est resté).
- Les leçons `pretri_renverse` restent lisibles et se produisent encore (premier jet, rafale acceptée) : `lecons.ts`,
  `leconsDuPreTri`, la route `lecons`, `scripts/lecons.ts`. Celles déjà en base avec une règle du pré-tri (R73, R74, R75, A3,
  A4, A7, A10, A11) se relisent comme avant ; `motProposition` dit encore « pré-tri » pour elles.
- Les réglages `horloge_*`, `moment_deposant`, `variete_lambda` restent dans `editeur/reglages.ts` : les retirer changerait
  `versionReglages()` et l'empreinte de toutes les leçons à venir. Ils ne servent plus à rien tant que le pré-tri dort.

## Comment le remettre
1. `git mv archive/pretri-2026-11/pretri.ts src/lib/mise-en-page/editeur/pretri.ts`, et y remplacer la déclaration de
   `Proposition` par `import type { Proposition } from "./types";` (puis `export type { Proposition }` si besoin).
2. Dans `src/lib/mise-en-page/editeur/index.ts` : `export { decalagesHorloges, marquesProposees, preTrier, qualite } from "./pretri";`
   et `export type { PreTri } from "./pretri";`.
3. Le geste : `| { type: "preTrier"; confirme?: boolean }` dans `GesteModifiant` (`editeur/types.ts`) ; `"preTrier"` dans
   `MODIFIANTS` (`editeur/etat.ts`) et, dans `executer`, avant l'`accepterRafale` :
   `if (g.type === "preTrier") x = { ...x, pretri: { ...x.pretri, ...preTrier(e.catalogue, e.magazine, e.lecture).propositions } };`
   Dans `plans.ts`, le `case "preTrier"` (il pose `ecartee`, `reserve` puis `choisie` par `marquer`, libellé
   « Pré-tri · 3 gardées, 2 écartées ») : il est recopié dans l'historique git (`git show db5285a4:src/lib/mise-en-page/editeur/plans.ts`).
4. L'écran : recoller `BoutonPreTri` dans `TriBulles.tsx`, le reposer dans `Panneau.tsx` à côté de `<PaletteTri />`, et ses deux
   règles CSS dans `mise-en-page.css`.
5. Les tests : recoller `verif-pretri.ts` à sa place (chaque bloc dit où).
