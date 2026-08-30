---
id: T-074
titre: Un prix selon le pays de livraison exige de demander le pays avant le prix
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Le prix suivant l'adresse de livraison. »
## Ce que j'ai vérifié
Structurellement impossible en l'état, et c'est documenté : `src/lib/atelier/prix.ts:80-91` —
le prix est affiché et payé AVANT que Stripe ne collecte l'adresse. Aujourd'hui : prix unique
port compris sur FR/BE/LU (`checkout/route.ts:177-180`), les DOM passent comme « FR »
(`prix.ts:67-73`).
## Ce que je propose
Deux chemins, à trancher :
1. **Rester au prix unique port compris** en ajustant la zone (retirer/ajouter des pays) —
   aucun changement de parcours.
2. **Prix par zone** : demander le pays de livraison sur la page d'état AVANT d'afficher le
   prix (changement de parcours cliente + grille de frais par zone à fournir), ou passer par
   `shipping_options` Stripe (le total varie alors DANS le checkout, après l'affichage du prix —
   risque de surprise au paiement).
**Question pour Mathias** : quelle option, et pour quels pays au-delà de FR/BE/LU ?
## Ce qui a été fait
—
