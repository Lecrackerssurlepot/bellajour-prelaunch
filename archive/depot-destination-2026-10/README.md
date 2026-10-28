# La fenêtre de dépôt du responsable, avant le choix de la destination (28/10/2026)

Copies telles qu'elles étaient sur `main` (8da3989e) avant les retours de Mathias du 28/10 :

1. un nouvel envoi remontrait l'ancien, fini (« quand un envoi est fini, on passe à autre chose ») ;
2. « Déposer des photos » ne savait viser qu'un DOSSIER du responsable (« Dans quel dossier ? »,
   des pastilles et un champ) ; il ouvre maintenant un choix « Mes photos », ses dossiers, ses
   LIENS (Bateau 1, Bateau 5…), « Nouveau dossier », un toucher puis la photothèque ; depuis la
   page d'un lien, ce lien est la destination par défaut, affichée, qu'on peut changer.

- `FenetreEnvoi.tsx` : la vue « Dans quel dossier ? » (pastilles + champ + grande zone à glisser).
  Remplacée par la liste des destinations (`destinationsDuDepot`, `dossiers.ts`).
- `ZoneDepot.tsx` : l'encart vide du tableau de bord, avec sa ligne « « Mes photos » · Changer »
  et son champ de nom. « Choisir des photos » y ouvre maintenant la même feuille de choix ; la
  ligne a disparu (la feuille porte le choix, un second endroit pour la même chose était de trop).

Rien n'est importé d'ici.
