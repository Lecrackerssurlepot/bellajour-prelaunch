---
id: T-005
titre: L'ancien mot de passe admin partagé ouvre encore la porte
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/admin-auth.ts:52-54` : les comptes nominatifs `ADMIN_PASSWORD_MATHIAS` et
`ADMIN_PASSWORD_LOUIS` existent, mais l'ancien `ADMIN_PASSWORD` partagé **est toujours accepté**,
sous un compte générique nommé `atelier`.
Effet : toute personne ayant connu l'ancien mot de passe garde un accès complet à `/admin/atelier`
— qui écrit en base, envoie des mails et lance des impressions réelles. Et ses gestes sont
attribués à « atelier », donc à personne.
## Ce que je propose
Retirer le repli. Vérifier d'abord que `ADMIN_PASSWORD_MATHIAS` et `_LOUIS` sont bien posés sur
Vercel en Production ET en Preview, sinon la porte se ferme sur nous.
## Ce qui a été fait
—
