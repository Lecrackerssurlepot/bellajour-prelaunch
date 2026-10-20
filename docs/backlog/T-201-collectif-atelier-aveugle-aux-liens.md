---
id: T-201
titre: L'atelier ne voit pas les liens de contribution d'une édition et ne peut pas en créer
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
- Seul le responsable crée les liens (`src/app/api/collectif/provenances/route.ts:45-48`) ; aucun
  écran de l'admin ne les lit. Pour voir ou préparer les liens des bateaux, l'atelier doit ouvrir
  le lien du responsable (`PanneauLiens.tsx:73-75`).
- Pour Audencia, préparer les huit liens AVANT de remettre l'espace à Mathilde éviterait une étape
  à la cliente.

## Ce que je propose
Dans « Réglages et liens », la liste des liens de contribution (nom, plafond, personnes,
photos) et la création d'un lien par l'atelier, journalisée.

## Ce qui a été fait
Rien encore.
