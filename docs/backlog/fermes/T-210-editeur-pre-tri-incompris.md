---
id: T-210
titre: Le bouton « Pré-trier » de l'éditeur ne sert toujours à rien pour Mathias, et certaines de ses marques sont incompréhensibles
etat: fermé
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« En ce qui concerne encore le projet pré-trié, je trouve que ça sert toujours à rien, il y a des trucs que je ne comprends pas. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- Le bouton « Pré-trier · N » est toujours là (`TriBulles.tsx`, ligne 114). Il pose des marques Écartée, Réserve et Gardée avec une raison (`pretri.ts`).
- Depuis le lot F (#363), la lecture IA propose les mises en avant, les groupes et les rafales à garder. Les deux outils se recouvrent, et le pré-tri parle encore en règles : « R74 », « A3 ».
- Constat confirmé. C'est le seul des sept qui retire quelque chose.

## Ce que je propose
Vérifier ce que le pré-tri fait encore depuis que la lecture IA (lot F, #363) propose les mises en avant, les groupes et les rafales. Si la lecture IA le couvre, retirer le bouton (code déplacé dans `archive/`, jamais supprimé) ; sinon, réécrire ses marques en mots clairs.

**Quand : vague 1.** Retirer le bouton et déplacer le code dans `archive/` avec un README. Ce qu'il faisait de bien (écarter les floues, les sombres, les rafales) reste visible par les étiquettes et les filtres. Petit.

## Ce qui a été fait
Le 16/11, vague 1, branche `feat/mise-en-page-vague-1` (pas encore fusionnée, pas de PR : le chef de projet relit les captures).
- Vérifié d'abord : le pré-tri ne servait plus qu'à son bouton. Le type `Proposition` restait utile au premier jet et à « Accepter »
  une rafale de la lecture IA : il passe dans `editeur/types.ts`.
- Le bouton « Pré-trier » disparaît de la barre Photos (`TriBulles.tsx`, `Panneau.tsx`, ses deux règles CSS), avec le geste
  `preTrier` (`types.ts`, `etat.ts`, `plans.ts`) et les exports `preTrier`, `marquesProposees`, `decalagesHorloges`, `qualite`.
- `editeur/pretri.ts`, le bouton et leurs tests sont dans `archive/pretri-2026-11/` avec un README : ce que c'était, pourquoi on
  l'a retiré, comment le remettre. Rien d'actif ne les importe (le harnais le vérifie sur tout `src/`).
- Les leçons restent lisibles : le type `pretri_renverse` et ses questions de fin d'export existent toujours (le premier jet et
  les rafales acceptées en produisent encore) ; une leçon de règle A10 ou R74 se relit et dit encore « pré-tri ». La question
  dit maintenant « Tu as changé la marque que la machine proposait. ». Les réglages du pré-tri (horloges, moments, variété)
  restent dans `reglages.ts` : les retirer changerait l'empreinte de toutes les leçons à venir.
- Ce qu'il voyait de juste reste visible : les étiquettes et les filtres « Ce que la machine a vu » (floue, sombre, rafale,
  capture, visage flou), prouvés au harnais sans pré-tri.
- Harnais : `scripts/verif-mep-vague-1.ts` (bloc T-210), le bloc « lot 3 » de `verif-mep-editeur.ts` réécrit sans pré-tri.
- Recette locale sur les photos de Merisa : `design-explorations/editeur-lots-2026-11-14/recette/vague-1/01` (la barre sans le
  bouton) et `02` (le menu Filtres).
