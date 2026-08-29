---
id: T-013
titre: Les pages animées ignorent « réduire les animations »
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`prefers-reduced-motion` est couvert dans 10 feuilles sur 34, mais **absent de celles qui
animent le plus** : `univers.css` (718 lignes, les sept pages du récit), `ouverture.css` (la
couverture qui s'ouvre), `pdp.css`, `composer.css`, `depot.css`, `numero.css`.
Effet : une visiteuse qui a activé la réduction des animations — souvent parce que le mouvement
lui donne le vertige ou la nausée — reçoit l'accueil dans toute son amplitude.
## Ce que je propose
Un bloc `@media (prefers-reduced-motion: reduce)` par feuille : les états finaux sont posés
d'emblée, les transitions ramenées à zéro. Le contenu reste identique, seul le trajet disparaît.
⚠️ Le séquenceur pose les états en JS : il doit lire la préférence et rendre les pages
directement composées, sinon le CSS seul laisserait des pages vides.
## Ce qui a été fait
**Largement périmé — vérifié le 29/08/2026 par l'audit d'accessibilité, puis à la main.**
`prefers-reduced-motion` est en réalité couvert à trois endroits : `theme.css:270` (pour tout
`.bj-atelier`), `univers.css:705` et `ouverture.css:362`. Le ticket décrivait un manque qui
n'existe plus.

⚠️ **Mais il reste un trou, et il est grave** : le bloc d'`univers.css:705` remet `transform` et
`filter`, **jamais `opacity`**. Or c'est l'`opacity` qui cache tout le contenu en attendant le
JavaScript. La réduction d'animation ne sauve donc PAS une page dont le script ne s'exécute pas.
Ce trou est repris dans **T-050**, à sa vraie gravité.
Fermé ici, poursuivi là-bas.
