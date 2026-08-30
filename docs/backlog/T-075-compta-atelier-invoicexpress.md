---
id: T-075
titre: Les ventes de l'atelier ne passent pas par la comptabilité InvoiceXpress
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Le client reçoit-il bien sa facture ? C'est bien automatisé avec notre système de
comptabilité ? »
## Ce que j'ai vérifié
La cliente reçoit bien une facture STRIPE : `invoice_creation` est activé
(`src/app/api/atelier/checkout/route.ts:170`) et le webhook récupère `hosted_invoice_url`
pour l'afficher sur sa page (`paiement.ts:121-130`) — Stripe n'envoyant pas toujours le mail,
c'est le lien qui fait foi. En revanche la chaîne comptable InvoiceXpress (fatura-recibo
certifiée, ATCUD) ne couvre que la PRÉVENTE : `invoice_jobs` est alimentée par le webhook
prévente (`webhook/route.ts:412-440`), jamais par l'atelier. L'Edge Function
`supabase/functions/emit-invoices/index.ts` dit elle-même n'émettre rien tant qu'elle n'est
pas invoquée — son déploiement et son pg_cron sont invérifiables depuis le disque.
## Ce que je propose
1. Vérifier d'abord l'état réel d'`emit-invoices` (déployée ? cron posé ? factures émises ?).
2. Puis brancher l'atelier : écrire dans `invoice_jobs` depuis `traiterPaiementAtelier`
   (plomberie simple, TVA 23 % comme la prévente).
C'est fiscal et ça touche de vraies factures certifiées : rien ne part sans l'accord de
Mathias, d'où l'avis-requis.
**Question pour Mathias** : l'immatriculation portugaise chez Stripe Tax (prérequis de la
bascule, cf. BASCULE-LANCEMENT) est-elle lancée ?
## Ce qui a été fait
—
