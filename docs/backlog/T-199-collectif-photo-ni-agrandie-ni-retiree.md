---
id: T-199
titre: Le responsable ne peut ni agrandir, ni signaler, ni retirer une photo, et personne ne peut supprimer une photo déposée
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- La route de signalement existe (`src/app/api/collectif/photos/marquer/route.ts:46-50`) mais
  aucun bouton de l'espace client ne l'appelle.
- Aucune vue agrandie dans la grille du responsable, aucune suppression d'une photo (la seule
  suppression est automatique, au-delà de 50 Mo, `depot/complete/route.ts:84`).
- Scénario : une photo déplacée arrive d'un participant ; le responsable ne peut rien en faire
  qu'écrire à l'atelier.

## Ce que je propose
Agrandir et « Ne pas publier » chez le responsable (le lot les préfixe déjà
« A-NE-PAS-PUBLIER »). Supprimer une photo, côté atelier seulement, en deux temps et journalisé :
c'est une suppression de données, Mathias tranche.

## Ce qui a été fait
Rien encore.
