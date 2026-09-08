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

## Ce qui a été fait (07/09/2026)

Deux gestes, dans cet ordre.

**1. Le rendu est sorti de la page.** `metriques/page.tsx` faisait tout : garde de session,
chargement, et 350 lignes de JSX. Le rendu vit maintenant dans `metriques/Vue.tsx`, la page ne
garde que la garde et le chargement — même patron que `compte/Espace.tsx`.

Ce n'est pas de la propreté pour la propreté : **un écran qu'on ne peut ouvrir sans mot de
passe ni base de données est un écran qu'on ne peut pas regarder, donc pas dessiner.** La
séparation permet de le rendre avec des chiffres fabriqués, en local, et de voir ce qu'on
change. C'est ce qui a permis la suite.

**2. La rangée de tête.** Quatre chiffres, en grand, avant tout le reste : chiffre d'affaires,
numéros payés (avec le nombre de dossiers commencés), panier moyen, délai de publication de la
couverture (avec le pourcentage tenu sous la promesse). La valeur est l'élément le plus gros de
la page, le libellé le plus discret — l'inverse du reste du back-office, et c'est voulu : on ne
lit pas un tableau de bord, on le balaie.

La variation compare à la période précédente, sans jamais juger ; pour un délai, baisser est
bon (`inverse`, déjà porté par `Ecart`). Sans période précédente (« Tout »), aucune variation
n'est affichée plutôt qu'un zéro trompeur. `tabular-nums` sur les valeurs : sans elle, la
rangée tremble quand on change de période.

Aucun calcul touché : `mesure.ts` et `metriques.ts` restent la seule source.

Vérifié à l'écran (chiffres fabriqués, page jetable non commitée) en 1440 et en 375 : quatre
colonnes, puis deux, puis une sous 560 px ; aucun débordement.

## Ce qui reste

La référence visuelle de Mathias (dashboard SyncEase : cartes sombres, graphes à barres douces,
chips) n'a pas été suivie : **je ne l'ai pas**. Ce qui est livré applique ce que le ticket
décrit en mots — hiérarchie, grande valeur, cartes de synthèse — dans le monde CRÈME de
l'admin. L'entonnoir et les courbes n'ont pas été retouchés : ils sont lisibles, et les
redessiner sans la référence serait du travail à refaire.

## État

`en cours` — la hiérarchie est posée, l'habillage fin attend la référence de Mathias.
