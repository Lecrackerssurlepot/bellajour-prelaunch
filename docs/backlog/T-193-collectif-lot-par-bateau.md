---
id: T-193
titre: L'atelier ne retrouve pas les bateaux, ni regroupement ni téléchargement par lien, et le nom des fichiers ne dit ni la personne ni le lien
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
20/10, relecture de main (`025ef24`) :
- Les photos d'un lien de contribution vont bien dans un dossier à part chez le responsable
  (`src/lib/collectif/dossiers.ts:200,214,254`).
- Mais côté atelier, « Qui a déposé » et le lot se font par « type · nom » (`libelleProvenance`,
  `src/lib/collectif/grille.ts:34-38`, filtre `lot/route.ts:94`) : « Un participant · Léa Martin »,
  jamais « Bateau 3 ».
- Les fichiers du lot s'appellent « rang - date - ville - nom d'origine » dans l'ordre d'arrivée
  (`src/lib/atelier/lot.ts:188-207`) : ni la personne ni le bateau.
- Pour Audencia (8 bateaux), l'atelier composerait sans savoir quelle photo vient de quel bateau.

## Ce que je propose
Regrouper la carte Photos de la fiche par lien (bateau), puis par personne ; « Télécharger » par
lien, dans un dossier « Lot - <nom du lien> » ; le nom de la personne dans le nom du fichier.
Harnais : le lot d'un lien ne contient que ses photos, numérotées dans l'ordre choisi.

## Ce qui a été fait
Rien encore.
