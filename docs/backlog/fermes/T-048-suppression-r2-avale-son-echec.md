---
id: T-048
titre: La garantie « pas d'objet sans ligne » n'existe pas vraiment
domaine: donnees
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/atelier/r2.ts:253-256` — `supprimer()` avale l'échec du DELETE dans un `catch` qui se
contente d'un `console.error` et rend `void`.
Or `photos/supprimer/route.ts:67-71` justifie explicitement son ordre d'exécution : « l'objet
D'ABORD, la ligne ensuite. Dans l'autre ordre, un échec entre les deux laisserait un objet sans
ligne — donc invisible, donc éternel. »
Comme l'appelant **ne peut pas savoir** que le DELETE a échoué, il supprime la ligne quand même.
La garantie que ce commentaire décrit n'existe donc pas. Ce sont exactement les orphelins que
T-023 compte, et le compteur montera sans que personne ne sache pourquoi.
## Ce que je propose
Rendre un booléen depuis `supprimer()` et ne retirer la ligne que si l'objet est bien parti.
À faire avec T-042 (les vignettes, jamais supprimées) : c'est le même chemin.
## Ce qui a été fait
—
