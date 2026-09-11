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

## Fermé le 10/09/2026

Chemin 2 retenu, sous une forme plus simple que prévu : le pays de livraison est demandé
**à l'écran 4 du questionnaire** (menu France / Belgique / Luxembourg, France présélectionnée,
règle unique dans `questionnaire.ts`), stocké dans `numeros.pays_livraison`, exigé et modifiable
par l'admin à la publication de l'aperçu. Le prix du magazine reste le même dans toute la zone ;
c'est la **livraison** qui dépend du pays, chiffrée par devis Cloudprinter à la publication et
gelée sur le dossier (`livraison_centimes`, `livraison_niveau`). Stripe ne propose plus que le
pays déclaré (`allowed_countries = [pays]`), et le webhook journalise toute divergence entre le
pays déclaré et l'adresse collectée. PR #100, #101, puis le lot livraison.

## 11/09/2026 — la zone devient l'Europe, et le client choisit quand l'atelier ne sait pas

Mathias : « accepter tous les pays d'Europe » et « l'atelier ne peut pas mettre la livraison, on
ne sait pas d'où vient le client ». PR #114 : `PAYS_LIVRAISON` = UE 27 + GB, CH, NO ; si le pays
est connu (écran 4) le devis se fait à la publication, sinon la publication passe sans port et le
client choisit son pays sur `/numero` (`POST /api/atelier/livraison`, devis gelé, journal
`livraison_choisie`). Tranché par Mathias le 11/09 : taux normaux de TVA par pays validés
(`TAUX_TTC_LIVRAISON`), GB/CH/NO à 0 avec droits de douane à la charge du client, suivi colis
limité aux transporteurs FR/BE/LU accepté.
