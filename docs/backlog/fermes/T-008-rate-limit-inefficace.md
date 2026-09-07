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

## Ce qui a été fait (07/09/2026)

Le trou nommé par le ticket est bouché : `api/checkout` — la seule route payante sans aucun
frein — en porte un, sur le même patron et avec les mêmes plafonds que `api/atelier/numero`
(cinq écritures par minute et par adresse en production).

Deux constats faits en le posant, et ils comptent plus que le correctif :

- **Le trou n'a jamais pu être exploité.** Depuis la fermeture des préventes (01/09), cette
  route répond 410 d'entrée, avant toute écriture et toute création de session Stripe. Le
  frein est posé APRÈS cette garde : il ne sert à rien aujourd'hui, il servira le jour où la
  prévente rouvrira — et ce jour-là, personne n'aurait pensé à le reposer.
- **Ce n'est toujours pas une protection**, et c'est écrit dans le code en toutes lettres.
  La `Map` vit dans la mémoire d'une instance Vercel, qui redémarre à froid et se multiplie
  sous charge. Ça coupe un script naïf, ça n'arrête pas quelqu'un de déterminé.

Le compteur partagé reste possible (une table suffirait, pas besoin de Redis) mais n'est pas
fait, volontairement : poser une requête de base sur le chemin du paiement a son propre coût,
et rien ne l'a justifié à ce jour — aucun abus observé, préventes closes, tunnel atelier déjà
freiné. À rouvrir si le volume change.

## État

`fermé` — le trou nommé est bouché, la limite connue est documentée dans le code.
