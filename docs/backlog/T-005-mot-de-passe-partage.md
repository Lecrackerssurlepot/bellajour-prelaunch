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
31/08/2026 — Confirmé (`src/lib/admin-auth.ts:54` lisait encore `ADMIN_PASSWORD` sous le compte
« atelier »), puis corrigé :
- Vérifié AVANT de couper : `vercel env ls` montre `ADMIN_PASSWORD_MATHIAS` et
  `ADMIN_PASSWORD_LOUIS` posés en **Production ET Preview** — la porte ne se referme sur personne.
- `comptesAdmin()` ne lit plus `ADMIN_PASSWORD` (commentaire « ne pas le remettre » sur place).
  La variable peut rester sur Vercel : le code l'ignore.
- Les sessions signées « atelier » cessent de valider au déploiement (compte inconnu ⇒ null) ;
  celles de Mathias et Louis ne bougent pas — le format du cookie n'a pas changé.
- `PRENOM_COMPTE.atelier` est conservé UNIQUEMENT pour afficher les vieilles lignes du journal.
- Commentaires devenus faux mis à jour (`admin-auth.ts`, `login/page.tsx`, `login/Formulaire.tsx`,
  `src/app/admin/CLAUDE.md`).
- Harnais : section « T-005 : le mot de passe partage est mort » dans `scripts/verif-atelier.ts` —
  même avec `ADMIN_PASSWORD` posé dans l'env, aucun compte « atelier » n'existe, et un cookie
  signé de l'ancien secret est refusé. Tout passe.
