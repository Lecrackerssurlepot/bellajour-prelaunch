---
id: T-200
titre: Les vidéos sont refusées avec « ce ne sont pas des photos », sans que la page le dise avant le choix
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
- Formats acceptés : JPEG, PNG, WebP, HEIC, HEIF (`src/lib/atelier/formats.ts:22-30`) ; 50 Mo par
  fichier (`formats.ts:19`). Une vidéo est écartée après le choix (`moteur.ts:426-429`).
- Une Live Photo d'iPhone n'a aucun traitement particulier : la photo part, la vidéo non.
- Un magazine n'imprime pas de vidéo, mais un participant d'un week-end en bateau en filmera.

## Ce que je propose
Décision de Mathias : refuser (et l'écrire AVANT le choix : « Photos seulement, les vidéos ne
partent pas ») ou accepter les vidéos pour l'atelier (stockage et poids à chiffrer).

## Ce qui a été fait
Rien encore.
