---
id: T-043
titre: Une panne de base fait dire à la cliente que son dossier n'existe pas
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/atelier/numero/route.ts:273-280` et `photos/complete/route.ts:121-126` font
`const { data: numero } = await …` : l'`error` est jetée, et `!numero` est ensuite interprété
comme « token inconnu » → **404 introuvable**.
Les mêmes routes vérifient pourtant l'erreur partout ailleurs (`presign:80`, `valider:44`,
`checkout:112`) : c'est une omission, pas un parti pris.
Sur une panne Supabase ou une colonne manquante, la cliente clique « Envoyer à l'atelier » et lit
que **son dossier n'existe pas**. Elle n'a aucune raison de réessayer plus tard : on vient de lui
dire que son numéro a disparu. Pendant ce temps `nb_photos` reste figé et ses photos dorment sur
R2.
## Ce que je propose
Distinguer les deux cas, comme les routes voisines : une erreur de base rend 500 (« réessayez
dans un instant »), une absence de ligne rend 404. Deux issues différentes pour deux causes
différentes.
## Ce qui a été fait
—
