---
id: T-197
titre: Le grand QR code « à projeter ou à imprimer » existe mais aucun écran ne l'ouvre
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- `src/app/edition/_composants/LienContribution.tsx:294` porte une fenêtre de QR code en grand ;
  aucun composant ne l'appelle. Le responsable ne peut que télécharger le petit QR en SVG
  (`LienContribution.tsx:42-85`).
- Pour un bateau, un QR imprimé et scotché à bord est le moyen le plus simple de retrouver le lien.

## Ce que je propose
Un bouton « Afficher en grand » sur chaque carte de lien, avec le nom du lien sous le code,
prêt à imprimer.

## Ce qui a été fait
Rien encore.
