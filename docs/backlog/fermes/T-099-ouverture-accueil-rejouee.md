---
id: T-099
titre: L'ouverture de l'accueil rejoue à chaque retour et se fait bousculer par le défilement
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-09-04
---

## Ce que Mathias a dit (04/09)

« Quand je scrolle souvent, cela crée un bug avec la homepage qui est en train de s'animer. Je
pense aussi que quand la page est chargée il faut éviter que, quand on retourne sur la homepage,
l'animation recharge : cela peut faire buguer pour rien sur un téléphone pas assez puissant. »

## Ce qui se passait (lu dans le code, `Ouverture.tsx` et `Univers.tsx`)

1. **L'ouverture rejouait à chaque montage.** Aller sur `/magazine` puis revenir relançait les
   2,8 s de découpe, le voile, la lumière rasante et l'écartement du titre. Sur un téléphone
   modeste, c'est ce rejeu qui saccade — pour un spectacle déjà vu.
2. **Le défilement pendant l'ouverture faisait se marcher dessus deux mouvements** : la découpe
   qui s'élargit, le titre qui change de régime et le voile qui se pose, le tout sous une page
   qui descend.
3. **Le parallaxe se désynchronisait.** La dérive de l'image n'est calculée qu'une fois la
   couverture ouverte ; qui avait défilé avant gardait une image figée à sa position de départ,
   qui SAUTAIT au défilement suivant.
4. **`resize` recalculait la découpe pendant qu'elle s'ouvrait.** Sur téléphone, la barre
   d'adresse se rétracte dès qu'on descend : l'événement part alors qu'aucune mise en page n'a
   bougé, et la découpe sursautait.
5. **Les défilements pilotés prenaient la page en otage.** « Découvrir l'univers Bellajour »
   (1,3 s) et « Tourner la page » (1,1 s) écrivent la position à chaque image : un doigt qui
   défile pendant ce temps se fait reposer soixante fois par seconde. La page paraît collée,
   puis repart d'un coup. C'est le « bug au scroll » le plus reproductible de l'accueil.

## Ce qui a été fait (04/09)

- **L'ouverture ne joue qu'une fois par onglet.** `sessionStorage` (`bj:ouverture-vue`), relu par
  un script EN LIGNE de `page.tsx` **avant la première peinture** — posé dans un `useEffect`, le
  drapeau serait arrivé trop tard et on aurait vu la couverture repliée clignoter. Il pose
  `data-ouverture-vue` sur `<html>` ; `ouverture.css` sert alors l'état final sans transition.
  Nouvel onglet demain : la couverture s'ouvre à nouveau.
- **Le défilement prend la main.** Passé un quart d'écran, l'ouverture se termine SEC, sans
  transition : on arrête le film au lieu de le jouer dans le dos de la personne.
- **Le parallaxe se recompose** à l'ouverture (`derniereY = -1`), donc plus de saut.
- **`resize` ne remesure qu'au changement de LARGEUR** — la règle maison de `--app-height`,
  appliquée ici aussi.
- **Les deux défilements pilotés rendent la main au premier geste** (molette, doigt, clavier,
  pointeur), et les écoutes sont armées à la première image, jamais pendant l'événement qui les
  a déclenchées — sinon un « Entrée » sur le bouton s'annulerait lui-même.

## Vérifié

`tsc`, `lint`, `build` verts, `/` toujours **prérendue statique** et le script en ligne présent
dans le HTML servi. Au navigateur : premier passage, la chorégraphie joue et le drapeau
s'écrit ; retour, `data-ouverture-vue` est là dès le chargement, la page est composée d'emblée
(découpe `inset(0)`, voile à 1, titre en place, toutes transitions à `none`) et la capture est
identique à la fin de l'animation. La prise en main au défilement n'a pas pu être filmée : le
panneau d'aperçu de cette session est masqué, donc sans hauteur ni `requestAnimationFrame`.

## Vérifié une seconde fois (07/09, lot 0 du chantier « Un vrai site »)

Au navigateur, viewport 375×812 puis desktop, sur le serveur de dev :

- **Anti-rejeu prouvé dans les deux sens** : `/` → `/magazine` → retour, `data-ouverture-vue`
  est posé avant la première peinture, l'état final se sert sans transition, zéro clignotement.
- **Chorégraphie complète** : `pret` puis `plein`, drapeau `bj:ouverture-vue` écrit, aucune
  erreur console.
- **La prise en main au défilement, enfin observée** : page rechargée drapeau purgé, défilement
  à 300 px pendant l'ouverture (seuil mesuré : 203 px) — dès l'hydratation, la bascule sèche se
  produit (`plein` posé, `data-ouverture-vue` sur `<html>`, drapeau écrit). Le seul délai
  constaté est l'hydratation du mode dev, sans objet en production.
- **Non testé ici** : l'interruption des défilements pilotés (« Découvrir l'univers »,
  « Tourner la page ») — le panneau d'aperçu s'est masqué en cours de session et fige
  `requestAnimationFrame` (piège documenté). À confirmer du doigt sur iPhone réel lors de la
  recette du lot.

## État

`à fermer` — corrigé, vérifié deux fois, commité sur `fix/t099-ouverture-rejouee`.
