---
id: T-133
titre: Deux lots dans deux ordres s'écrivaient dans le même dossier, numérotations mêlées
etat: en cours
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« Je télécharge mes photos et elles ne se mettent pas dans l'ordre chronologique que je veux. »
(fiche d'Eloise, après un premier téléchargement dans l'ordre du dépôt le matin même)

## Ce que j'ai vérifié
- `nomDossier()` (lot.ts) ne connaissait pas l'ordre : « Eloise - La vie, les copains & le
  reste » quel que soit le bouton enfoncé. `ecrireLot()` (telechargement.ts) ouvre ce dossier
  avec `create: true` et écrit fichier par fichier, sans jamais rien effacer (choix D : un lot
  interrompu se reprend en réécrivant par-dessus).
- Les noms de fichiers changent dès le préfixe selon l'ordre (« 01 - 11 juil 2026 - IMG_8027 »
  au dépôt, « 01 - 10 jan 2026 - Amboise - IMG_4140 » par date). Un second lot dans un autre
  ordre ne REMPLACE donc rien : il s'AJOUTE. Le dossier contient alors deux lots complets,
  126 fichiers pour Eloise, et le Finder trié par nom les entrelace : « 01 - 10 jan », « 01 - 11
  juil », « 02 - 11 jan », « 02 - 12 juil »… Exactement « pas dans l'ordre que je veux ».
- Le tri lui-même est juste : prouvé sur la route avec le lot réel d'Eloise (T-128, T-130,
  T-131), déploiements vérifiés.

## Ce que je propose
Le nom du dossier porte l'ordre : « Eloise - La vie… (par date) », « … (par lieu) »,
« … (par lieu, sans date voisines) ». L'ordre du dépôt garde le nom nu. Le même ordre retombe
sur le même dossier et le réécrit (la reprise d'un lot interrompu tient), un autre ordre en
ouvre un autre. Rien n'est effacé, jamais.

## Ce qui a été fait
22/09/2026, branche `fix/dossier-par-ordre`. `nomDossier(…, ordre, cale)`, `ecrireLot` reçoit
`ordre` et `cale`, la fiche les passe. Harnais +1. `admin/CLAUDE.md` à jour.

## Ce qui reste
Chez Mathias : vider (ou renommer) le dossier « Eloise - La vie, les copains & le reste » déjà
mêlé, puis retélécharger : le lot par date ira dans « … (par date) ».
