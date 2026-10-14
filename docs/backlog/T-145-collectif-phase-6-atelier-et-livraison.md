---
id: T-145
titre: Le client B2B ne peut ni demander un appel ou une modification, ni suivre sa livraison
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« Je veux pouvoir ouvrir de vraies éditions de test et tout utiliser de bout en bout (phases 0 à
6). »

## Ce que j'ai vérifié
- `suivi.ts` (`lireSuivi`) refuse les liens approximatifs : un transporteur inconnu garde son
  numéro sans adresse. `marquer_expediee` (gestes.ts) l'utilise déjà.
- Pas d'API transporteur ni de moteur de créneaux : le PRD §0.5 tranche (lien Google, étapes
  posées à la main).

## Ce que je propose
PRD §4.2, phase 6 :
- « Parler à l'atelier » : le lien de rendez-vous Google de la fiche (`rdv_url`, nouvel onglet,
  `no-referrer`) ; « Demander une modification » (motifs + texte → message + événement) ; la
  proposition complémentaire est un document posé par l'atelier, « Accepter » ne fait que
  journaliser et prévenir l'atelier (aucun paiement, aucun montant) ;
- livraison : saisie transporteur + numéro (`marquer_expediee`, `marquer_livree`), page client
  (étapes, transporteur, bouton vers le site du transporteur, adresse).

**Recette** : une demande de modification visible côté atelier, un numéro de suivi qui ouvre le
bon lien transporteur.

## Ce qui a été fait
13/10/2026, branche `feat/collectif-phases-2-a-6` :
- **`livraison.ts`** (pur) : les cinq motifs de la maquette, la demande (« Autre chose » exige un
  mot), possible jusqu'à la validation du bon à tirer ; les messages d'acceptation sans montant ;
  le jour prévu (`AAAA-MM-JJ`, lu sans fuseau) ; les quatre étapes de la livraison avec les
  dates LUES (dernière validation de BAT, geste « Lancer l'impression » au journal, dates
  d'expédition et de livraison posées par les gestes).
- **Parler à l'atelier** `/edition/[t]/atelier` : 1 la demande (motif + texte → un message dans
  la messagerie de l'atelier + le journal), 2 le lien de rendez-vous Google de la fiche, puis
  les propositions complémentaires posées par l'atelier dans le dossier (« En reparler »,
  « Accepter » en deux gestes : message, journal, mention « Acceptée le … » sur le document ;
  aucun paiement, aucun montant ; une proposition ne s'accepte qu'une fois).
- **Livraison** `/edition/[t]/livraison` : titre selon l'étape, jour prévu s'il est posé, les
  quatre étapes datées, le colis (transporteur, numéro à copier, « Suivre chez le transporteur »
  quand `suivi.ts` connaît l'adresse), l'adresse.
- **Atelier** : panneau « Livraison » sur la fiche (adresse, jour prévu, fusionnés dans
  `livraison`) ; le transporteur et le numéro passent par le geste « Marquer expédiée » ; le
  statut d'une proposition se lit dans les documents.
- **Prouvé en local contre la production (13/10)** sur une seconde édition d'essai menée jusqu'au
  bout : demande de modification lue par l'atelier, deux propositions acceptées (la seconde
  acceptation refusée), validation refusée sans couverture puis acceptée « sans préférence »,
  demande de modification refusée après validation, impression, jour impossible refusé,
  expédition sans numéro refusée, Colissimo + numéro → lien laposte.fr, livrée. Aucun
  débordement à 375 px.
