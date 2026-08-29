---
id: T-049
titre: L'adresse de retour après paiement n'est pas vérifiée
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/atelier/checkout/route.ts:158` — `const origin = request.headers.get("origin") ||
SITE_URL`, qui sert ensuite de base aux `success_url` et `cancel_url` de la session Stripe
(`:245-246`), **sans être comparé à une liste d'origines connues**. L'en-tête `Origin` est posé
librement par tout client qui n'est pas un navigateur.
Scénario : quelqu'un qui détient le token d'une cliente forge une session dont le `success_url`
pointe chez lui, et lui envoie le lien Stripe. Le lien est authentique (checkout.stripe.com), le
montant est juste, elle paie réellement — et Stripe la dépose sur une copie de sa page « Votre
numéro », qui peut lui redemander ses coordonnées bancaires.
## Ce que je propose
Comparer `origin` à une liste explicite (`bellajour.fr`, `www.bellajour.fr`, les previews Vercel,
`localhost:3000`) et retomber sur `SITE_URL` sinon.
⚠️ **Avis requis malgré la simplicité** : cette ligne est sur le chemin qui encaisse. Une liste
incomplète ne dégrade rien — elle casse le paiement pour tout le monde. À faire avec une
vérification en preview avant la production.
**Question pour Mathias** : la liste ci-dessus est-elle complète ? Utilises-tu un autre domaine
(un lien Instagram, un raccourcisseur, un domaine de test) qui appellerait cette route ?
## Ce qui a été fait
—
