---
id: T-024
titre: La page Santé crie sur une base vide
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« Elle signale "aucun mail parti depuis longtemps" quand il n'y a plus aucun dossier. Le constat
devrait se taire s'il n'y a rien à envoyer, pas seulement si rien n'a été envoyé. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. `sante.ts` vit dans `src/app/admin/atelier/`.
Effet : une alerte qui crie à tort apprend à ne plus regarder les alertes. C'est le défaut le
plus coûteux d'un écran de surveillance, parce qu'il désarme les vraies.
## Ce que je propose
Distinguer « rien à envoyer » de « quelque chose aurait dû partir » : le constat ne se déclenche
que s'il existe au moins un dossier éligible. Vérifier au passage les autres constats de la page
pour la même faute.
## Ce qui a été fait
—
