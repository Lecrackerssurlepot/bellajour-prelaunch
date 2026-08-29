---
id: T-013
titre: Les pages animées ignorent « réduire les animations »
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
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
—
