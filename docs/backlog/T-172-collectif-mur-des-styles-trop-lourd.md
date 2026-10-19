---
id: T-172
titre: Le mur des styles affiche les images maîtresses (jusqu'à 2 400 px et 4 Mo) dans des cartes de 300 px
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/admin/collectif/styles/reduireImage.ts:12-13` : une pièce de style garde jusqu'à
  2 400 px de côté et 4 Mo. Le mur et la fiche d'un style l'affichent telle quelle, sans vignette
  ni `srcset` (`src/app/edition/[token]/style/CartePiece.tsx:46`, `Mur.tsx:281`,
  `style/[slug]/FicheStyle.tsx:165,242,268`). « Tout, en vrac » rend toutes les pièces de tous
  les styles publiés (en `loading="lazy"`).
- **Non mesuré** : le poids réel des pièces dans le coffre. C'est le premier écran du client,
  souvent sur téléphone.

## Ce que je propose
Une vignette de 600 px (et 1 200 px pour la fiche) produite à l'enregistrement du style, servie
en `srcset` ; l'image maîtresse seulement en grand. Mesurer le poids du mur avant et après.

## Ce qui a été fait
Rien encore.
