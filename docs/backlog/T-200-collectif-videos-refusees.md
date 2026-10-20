---
id: T-200
titre: Les vidéos sont refusées avec « ce ne sont pas des photos », sans que la page le dise avant le choix
etat: en cours
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
20/10, lot a2 (worktree `agent-a50f52eeeeed6d02d`, non commité). Décision de Mathias : les
vidéos ne sont pas acceptées.
- La page de dépôt l'écrit AVANT le choix, sous le bouton, toujours visible : « Photos
  seulement : les vidéos ne partent pas. » (`PHOTOS_SEULEMENT`, depot.ts).
- Le refus nomme la vidéo : « « IMG_0423.MOV » est une vidéo : seules les photos partent. »
  (une), « 3 vidéos ignorées : seules les photos partent. » (plusieurs), puis le reste « N
  fichier(s) ignoré(s) : ce ne sont pas des photos. » (`estVideo`, `phrasesIgnores`, depot.ts ;
  le moteur compte `videos` et garde le nom de la première).
- La saisie du nom n'a pas été touchée (autre lot). Vu à 390 px (préexistant) : le champ « Ton
  nom » déborde à droite de la carte, et le focus fait défiler la page de côté.
- Harnais : section « LOT a2 ». Captures : `e1-depot-photos-seulement.png`,
  `e2-depot-video-refusee.png` (un faux .MOV choisi, rien n'est parti).
