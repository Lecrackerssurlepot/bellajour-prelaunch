---
id: T-194
titre: Une photo arrivée au coffre mais pas encore confirmée (page fermée, téléphone verrouillé) reste invisible pour toujours
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
- La confirmation part du navigateur, groupée toutes les 15 s ou par 10 photos
  (`src/app/edition/_composants/depot/moteur.ts:80,785`). Si la page se ferme avant, l'objet est au
  coffre mais la ligne reste « déclarée » ; elle cesse de compter dans les plafonds après 2 h
  (`src/lib/collectif/depot.ts:43`) et n'apparaît nulle part.
- Elle ne revient que si le participant re-choisit la même photo (`depot.ts:131`). Aucune tâche
  ne rattrape ces photos (`vercel.json` : deux tâches, toutes deux des particuliers).
- Cas attendu à Audencia : on envoie depuis le port, on range le téléphone, l'écran se verrouille.

## Ce que je propose
À chaque ouverture de la fiche atelier ET une fois par jour : pour les lignes déclarées depuis
plus de 10 minutes, demander au coffre si l'objet existe (`HEAD`) et confirmer celles qui y sont,
avec le même contrôle de taille que `depot/complete`. Journaliser le nombre rattrapé. Harnais
sur la règle pure.

## Ce qui a été fait
Rien encore.
