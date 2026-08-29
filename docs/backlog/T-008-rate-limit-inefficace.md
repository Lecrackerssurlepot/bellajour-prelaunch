---
id: T-008
titre: Le rate-limit ne limite rien sur Vercel
domaine: paiement
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
Cinq routes portent un rate-limit en `Map` JavaScript, en mémoire de processus :
`api/waitlist/route.ts:13`, `api/atelier/numero/route.ts:28`, `api/atelier/checkout/route.ts:49`,
`api/ambassadeur/register/route.ts:19`, `api/ambassadeur/request-access/route.ts`.
Sur Vercel, chaque lambda a sa propre mémoire et redémarre à froid : **la limite n'est pas
partagée entre instances**. Elle freine un script naïf, elle n'arrête rien de déterminé.
Et `api/checkout/route.ts` (POST, crée une session Stripe) n'en a **aucun**.
Effet : rien d'observé à ce jour. Le risque est un flot d'inscriptions ou de sessions Stripe qui
pollue la base et le tableau de bord Stripe.
## Ce que je propose
Ne pas sur-construire. Deux options à trancher au moment de le faire : soit on assume et on
documente que c'est un frein et non une protection (c'est déjà écrit dans `src/app/api/CLAUDE.md`),
soit on pose un compteur partagé — une table Supabase suffit à ce volume, pas besoin de Redis.
Poser d'abord le rate-limit manquant sur `/api/checkout`, qui est le seul à créer un objet payant.
## Ce qui a été fait
—
