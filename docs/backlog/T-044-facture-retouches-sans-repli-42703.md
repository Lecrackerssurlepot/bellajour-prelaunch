---
id: T-044
titre: Deux colonnes récentes n'ont pas le filet que toutes leurs voisines ont
domaine: donnees
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/atelier/paiement.ts:145` (`facture_url`) et `src/lib/atelier/mails.ts:60`
(`retouches_demandees_le`) écrivent et lisent **sans repli sur l'erreur 42703**, alors que leurs
trois voisines de la même série en ont toutes un : `20260826` → `donnees.ts:272`, `20260829` →
`transition/route.ts:357` et `cloudprinter/webhook/route.ts:154`, `20260830` →
`complete/route.ts:98`.
**Danger aujourd'hui : nul.** Vérifié le 29/08 auprès de la base : la migration
`20260828_atelier_retouches_et_facture` EST appliquée (version `20260826174645`), les colonnes
existent. Le ticket ne décrit donc pas une panne, mais un filet manquant.
Ce qui le rend sérieux quand même : T-001 prouve qu'une migration de cette même série n'est PAS
appliquée. Le motif « on déploie le code avant la migration » est donc réel sur ce projet, et
c'est exactement le cas que le repli couvre. Si la colonne manquait, l'`update` de confirmation
de paiement échouerait EN ENTIER, la route rendrait 500, Stripe rejouerait en boucle, le numéro
resterait en `apercu_pret` et M4 ne partirait jamais : la cliente a payé, et sa page lui affiche
toujours le bouton « Commander ».
## Ce que je propose
Poser le repli aux deux endroits, comme ailleurs. ⚠️ Et poser en même temps le garde-fou que
T-001 a révélé : le repli fait DISPARAÎTRE le champ en silence, donc il doit journaliser qu'il
s'est déclenché. Un filet muet transforme une panne bruyante en donnée perdue.
## Ce qui a été fait
—
