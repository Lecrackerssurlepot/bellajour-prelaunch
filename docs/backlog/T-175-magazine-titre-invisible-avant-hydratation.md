---
id: T-175
titre: Sur téléphone lent, le titre de la page produit reste invisible trois secondes après l'apparition de la barre
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
- `src/app/(atelier)/components/Reveal.tsx:41-48` et `theme.css:310-315` : le titre et le chapô
  de `/magazine` sont à `opacity: 0` dans le HTML servi, et n'apparaissent qu'après l'hydratation
  (garde de 5 s dans `layout.tsx:40`).
- MESURÉ (audit du 19/10, mobile lent simulé) : plus grand affichage (LCP) = le chapô, 3,94 s en
  médiane pour un premier affichage à 0,8 s ; 1,07 s sans bridage.
- ⚠️ Le mouvement est voulu : « le motion est le produit » (mémoire du projet, trafic Instagram).

## Ce que je propose
Garder l'animation, mais la faire partir du CSS seul pour le premier écran (le texte apparaît
sans attendre React), ou rendre le titre visible d'emblée et n'animer que la suite. À montrer à
Mathias avant de toucher : c'est une décision de rendu.

## Ce qui a été fait
Rien encore.
