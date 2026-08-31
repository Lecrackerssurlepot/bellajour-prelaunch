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
31/08/2026 — Confirmé (`/api/admin/login` n'avait ni compteur, ni délai, ni verrouillage), puis
freiné — sans attendre T-008, avec les limites dites en face :
- Règle pure dans `src/lib/frein-login.ts` : délai croissant par échec (500 ms × échecs,
  plafonné à 8 s), blocage 429 à 10 échecs dans une fenêtre de 15 min, oubli après la fenêtre,
  ardoise effacée au succès. Le module DIT ce qu'il n'est pas : la `Map` est par instance Vercel,
  ça décourage un script naïf, ça n'arrête pas une attaque (cf. src/app/api/CLAUDE.md).
- Branché dans `src/app/api/admin/login/route.ts` : purge de la Map, 429 si bloqué, délai
  serveur AVANT le 401 (incompressible pour un client séquentiel), `console.warn` dans les logs
  Vercel à partir du 3e échec (IP + compte demandé, jamais le mot de passe soumis).
- La comparaison à durée constante et le mot de passe témoin existaient déjà — conservés.
- `Formulaire.tsx` distingue le 429 (« Trop de tentatives ») du 401 (« Identifiants
  incorrects ») : Mathias freiné ne croit plus son mot de passe faux.
- Harnais : section « T-046 : le frein du login admin » dans `scripts/verif-atelier.ts`. Tout passe.
- T-005 traité d'abord, comme la fiche le demandait : la porte partagée est retirée.
