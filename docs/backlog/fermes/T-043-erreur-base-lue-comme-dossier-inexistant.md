---
id: T-043
titre: Une panne de base fait dire à la cliente que son dossier n'existe pas
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
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
31/08/2026 — confirmé, corrigé. Trois routes clientes confondaient panne et absence (l'`error`
de `maybeSingle` était jetée, puis `!data` → 404 « introuvable ») :
- `api/atelier/numero/route.ts` (PATCH, la lecture avant consentements/M1) ;
- `api/atelier/photos/complete/route.ts` (le lookup du numéro) ;
- `api/atelier/photos/supprimer/route.ts` (les DEUX lookups, numéro et photo).
Chacune rend désormais 500 `internal` sur une erreur de lecture, 404 seulement sur une vraie
absence — même règle que `/valider`, `/checkout` et `/presign` qui la portaient déjà.
Côté cliente, rien à changer : le moteur du dépôt traite déjà le 404 comme définitif
(« reprenez le questionnaire ») et le 500 comme retentable avec backoff et messages sobres
(« Connexion instable — l'envoi reprend tout seul », « L'atelier n'a pas pu enregistrer votre
accord. Réessayez. »). La page `/numero/[token]` distinguait déjà (`lireNumero` → `'panne'` →
« La page ne répond pas. Le dossier est intact… »). Pas de test harnais : la distinction vit
dans les routes (I/O), pas dans un module pur.
