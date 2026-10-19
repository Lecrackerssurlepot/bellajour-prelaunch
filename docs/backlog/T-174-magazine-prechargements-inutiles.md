---
id: T-174
titre: La page produit précharge 333 Ko qu'elle n'utilise pas, un quart des données mobiles
etat: nouveau
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- MESURÉ par l'audit du 19/10 (Chrome sans fenêtre, lien lent 1,6 Mbit/s, processeur ×4, 5
  passes) : `/magazine` transfère 1 256 Ko, dont 333 Ko préchargés et jamais utilisés (l'image
  d'accueil `header-magazines-1280.webp` 293 Ko, la police du composeur 40 Ko, 5 feuilles CSS).
  Sans eux : 923 Ko, et l'événement `load` passe de 6,15 s à 4,88 s. Le premier affichage ne
  bouge pas. `/` : 96 Ko de plus (`couverture-sicile-900.webp`).
- Origine : le préchargement de la couverture (`src/app/(atelier)/magazine/page.tsx:178`) et
  celui des `<Link>` de navigation.

## Ce que je propose
Ne précharger que ce que la page affiche ; `prefetch={false}` sur les liens dont la page voisine
est lourde. Remesurer avec le même protocole.

## Ce qui a été fait
Rien encore.
