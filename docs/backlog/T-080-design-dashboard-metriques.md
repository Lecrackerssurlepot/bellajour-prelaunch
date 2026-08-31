---
id: T-080
titre: Le dashboard métriques mérite un vrai design de tableau de bord
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-08-31
---
## Ce que Mathias a dit
« Le tableau métriques mériterait d'être beaucoup plus design, comme le visuel que je t'avais
apporté (dashboard SyncEase : cartes arrondies sombres, grandes valeurs, graphes à barres
douces, chips), mais ce n'est pas une priorité. »
## Ce que j'ai vérifié
La page `/admin/atelier/metriques` (livrée le 30/08) est fonctionnelle et sobre : barres CSS,
tableaux, style admin crème existant. Les données et les calculs sont bons ; c'est l'habillage
qui est en dessous de la référence visuelle montrée.
## Ce que je propose
Une passe de design dédiée, sans toucher aux calculs (`mesure.ts` et `metriques.ts` restent
la seule source) : cartes de synthèse avec grande valeur + variation, entonnoir et courbes
retravaillés, hiérarchie visuelle façon tableau de bord. Rester dans le monde CRÈME de
l'admin (tokens `--bj-*`) — ne pas importer le monde sombre de l'atelier dans le back-office.
À faire quand les priorités de lancement seront passées.
## Ce qui a été fait
—
