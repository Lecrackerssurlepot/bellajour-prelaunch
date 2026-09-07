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
**01/09/2026 — vérifications faites, code préparé, EN ATTENTE du comptable.**

Étape 1 (état réel d'`emit-invoices`) : la chaîne prévente FONCTIONNE. Edge Function
`emit-invoices` déployée et active ; pg_cron `emit-invoices-worker` actif toutes les 5 min ;
16 faturas `emitted`, 0 bloquée. Le tuyau coule.

Étape 2 (brancher l'atelier) : ÉCRITE mais NON déployée. `traiterPaiementAtelier` insère
désormais dans `invoice_jobs` (calqué sur la prévente), avec garde `livemode` (rien en test)
et garde fondatrice 0 € (pas de `payment_intent`). Branche `fix/atelier-invoice-jobs`
(commit dad0730), non poussée. Vérifs vertes (tsc, lint, build, verif-atelier).

**BLOCAGE FISCAL — décision du comptable requise avant tout déploiement.** Vérifié dans le
Stripe LIVE le 01/09 : collecte TVA dans **0 territoire** (non immatriculé), et Stripe signale
**seuil déjà dépassé en France (93 % du volume, 13 transactions) et au Luxembourg**. Émettre
des faturas PT à 23 % sans immatriculation = documents fiscaux faux. Ventes surtout FR : le bon
traitement est peut-être la TVA française via le guichet OSS, pas 23 % PT. À TRANCHER par le
comptable (immatriculation + taux) avant de déployer. Récap transmis à Louis le 01/09.

Garanties client vérifiées au passage : la facture Stripe part bien par mail en réel (reçus
« Paiements réussis » activés, PDF joint activé ; rien en mode test, ce qui est normal).
Supabase enregistre déjà tout (état payee, adresse, montant, TVA journalisée). 0 vente atelier
réelle à ce jour, donc aucun rattrapage.

**01/09/2026 — RÉPONSE DU COMPTABLE (Baito), transmise par Louis. Le taux à 23 % est FAUX.**
- La règle « 23 % PT sous 10 000 € » ne s'applique QU'AUX ventes liées au Portugal (produit
  fabriqué et expédié depuis le PT). Or aucun produit Bellajour ne part du Portugal
  (impression/expédition Cloudprinter). Donc toutes nos ventes relèvent de l'**OSS avec le
  taux de TVA du PAYS DU CLIENT**, jamais 23 % PT.
- La facture client **doit afficher la TVA** (standard de facturation).
- L'architecture TVA/facturation (rôles Stripe / InvoiceXpress / comptable) sera définie dans
  un **projet Claude dédié à la compta**, en cours de création par Louis.

**CONSÉQUENCES TECHNIQUES à traiter dans le projet compta dédié (NE RIEN DÉPLOYER avant) :**
1. La branche `fix/atelier-invoice-jobs` calcule 23 % en dur (calquée sur la prévente) → FAUX,
   à retravailler pour le taux du pays du client. NE PAS déployer en l'état.
2. L'Edge Function `emit-invoices` émet aussi en `IVA23` codé en dur → même correction.
3. ⚠️ Les **16 faturas de prévente déjà émises** l'ont été à 23 % PT → taux désormais réputé
   FAUX. À porter au comptable : régularisation probable (avoirs). Ce ne sont pas que les
   paiements de test.
