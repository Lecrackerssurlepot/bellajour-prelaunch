# « Les trois formats » — le bloc de prix de la page produit

Archivé le 10/09/2026 (chantier « grille par pages », lot 2), depuis
`src/app/(atelier)/magazine/Kiosque.tsx`.

## Ce que c'était

Un petit titre (« Les trois formats ») et une liste de trois encarts, un par palier de
l'ancienne grille :

| pages | prix | photos |
|---|---|---|
| 20 à 29 pages | 30 € | ~40 à 59 photos |
| 30 à 39 pages | 40 € | ~60 à 79 photos |
| 40 à 50 pages | 45 € | ~80 à 100 photos |

Le contenu venait de `PALIERS` et `PRIX_TITRE` (`src/app/(atelier)/content.ts`), tous deux
dérivés de `src/lib/atelier/grille.ts`. En vigueur du 28/08/2026 (mise en ligne de `/magazine`)
au 10/09/2026 ; l'ancêtre du bloc vivait dans `archive/accueil-v1/S4Final.tsx`.

## Pourquoi c'est parti

Mathias a livré le 10/09/2026 la grille finale : **un prix par nombre de pages exact**, vingt
prix de 25 € à 59 €. Il n'y a plus trois formats à comparer, il y a une échelle. Trois encarts
qui montreraient trois points d'une échelle de vingt seraient faux, et vingt encarts seraient
illisibles. Le prix se dit désormais en une ligne (`PRIX_LIGNE`) et en une phrase
(`PRIX_PHRASE`), toutes deux dans `content.ts`.

## Ce qui reste en place, et qu'il ne faut pas « nettoyer »

Les règles CSS `.prix-titre` et `.prix` de `src/app/(atelier)/magazine/pdp.css` — dont la
media query « 5 · LES TROIS PALIERS PASSENT SOUS LE BOUTON » (`order`) — n'ont PAS été
touchées : la refonte visuelle de la page produit est le travail d'un agent front qui suit,
et supprimer ces règles maintenant l'obligerait à les réécrire. Elles ne s'appliquent
aujourd'hui à aucun élément rendu.

Le fichier `Kiosque-bloc-prix.tsx.txt` porte le JSX exact, avec ses commentaires, pour un
retour au collé si la décision se rouvrait.
