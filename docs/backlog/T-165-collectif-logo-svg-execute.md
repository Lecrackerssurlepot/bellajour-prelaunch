---
id: T-165
titre: Un logo SVG déposé par un client exécute son script si l'atelier l'ouvre dans un nouvel onglet
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/lib/collectif/contenus.ts:43` : le contenu « Logo » accepte `svg` (servi en
  `image/svg+xml`, ligne 100). `src/lib/collectif/visionneuse.ts:11` range le SVG parmi les images.
- `src/app/edition/_composants/Visionneuse.tsx` l'affiche en `<img>` (sans danger), mais le bouton
  « Ouvrir dans un nouvel onglet » ouvre la MÊME adresse signée : le navigateur exécute alors
  le script contenu dans le SVG, sur le domaine du coffre R2 (pas bellajour.fr : le cookie de
  l'atelier n'est pas lisible).
- Scénario : un responsable dépose un logo piégé ; Mathias l'ouvre en grand, l'onglet affiche une
  fausse page de connexion. Peu probable (l'auteur est le client payant), d'où `confort`.

## Ce que je propose
Servir le SVG en téléchargement (`ResponseContentDisposition: attachment` sur l'URL signée,
comme `src/lib/atelier/r2.ts:197` sait déjà le faire) ou retirer « Ouvrir dans un nouvel
onglet » pour ce type.

## Ce qui a été fait
Rien encore.
