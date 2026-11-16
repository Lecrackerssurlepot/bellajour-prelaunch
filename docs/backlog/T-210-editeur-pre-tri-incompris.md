---
id: T-210
titre: Le bouton « Pré-trier » de l'éditeur ne sert toujours à rien pour Mathias, et certaines de ses marques sont incompréhensibles
etat: nouveau
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
