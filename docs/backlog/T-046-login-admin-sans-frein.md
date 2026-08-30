---
id: T-046
titre: La porte de l'atelier se laisse tester à l'infini
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/admin/login/route.ts:29` — la route est volontairement hors du middleware
(`middleware.ts:28`, sinon on ne pourrait jamais se connecter) et ne porte **aucun compteur de
tentatives, aucun délai, aucun verrouillage**. Cinq autres routes publiques en ont un.
On peut donc deviner un mot de passe au rythme du réseau. Et la porte ouverte est celle qui
commande une impression réelle, envoie des mails aux clientes et télécharge toutes les photos.
Aggravé par T-005 : l'ancien mot de passe partagé `ADMIN_PASSWORD` est encore accepté.
## Ce que je propose
Un frein par adresse IP sur cette route, plus un délai croissant après trois échecs.
⚠️ Le frein en `Map` mémoire ne tient pas sur Vercel (T-008) — donc à faire avec T-008, sur un
compteur partagé, sinon on pose une protection qui n'en est pas une. Traiter T-005 d'abord : il
retire une porte, c'est plus rentable que de la surveiller.
## Ce qui a été fait
—
