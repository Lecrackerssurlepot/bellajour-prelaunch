---
id: T-213
titre: La grille d'artiste (tiers, nombre d'or, diagonales) n'est pas utilisable : il faut une vraie grille comme dans Affinity, avec marges et colonnes et lignes (8 par 8)
etat: nouveau
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« Et la grille, j'aimerais que ça soit une grille vraiment utilisable comme sur Affinity, donc avec les marges et du 8 par 8, je crois. Là, ça me paraît pas utilisable. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- La grille affichée (touche O) ne montre que des lignes de jugement : les tiers, le nombre d'or, les diagonales (`grilleArtiste.ts`). Ni marges, ni colonnes.
- Pourtant, une vraie grille existe dans le moteur : marges 20/15/15/20 mm et 6 × 6 modules avec 5 mm de gouttière (`geometrie.ts`, lignes 23 et 30). L'IDML la donne déjà à Affinity en colonnes (`MarginPreference`). Elle n'est seulement jamais dessinée à l'écran.
- Mathias dit « 8 par 8, je crois » : à confirmer contre la grille 6 × 6 sur laquelle tous les gabarits sont bâtis.
- Constat confirmé.

## Ce que je propose
Une grille de mise en page réglable : marges, colonnes et lignes (8 × 8 par défaut, à confirmer), gouttières, visible sur la page, qui aimante les cadres, et qui part dans l'IDML comme repères quand Affinity sait les relire (D28 : essai d'abord). La grille d'artiste actuelle reste en option ou s'archive.

**Quand : vague 1.** Montrer la vraie grille : marges, colonnes, lignes, gouttières, avec l'aimant des cadres. Sa taille (6 × 6 ou 8 × 8) se tranche avec Mathias. La grille d'artiste reste une option. Moyen.

## Ce qui a été fait
