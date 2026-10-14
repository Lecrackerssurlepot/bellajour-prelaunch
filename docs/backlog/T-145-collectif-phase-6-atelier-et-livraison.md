---
id: T-145
titre: Le client B2B ne peut ni demander un appel ou une modification, ni suivre sa livraison
etat: nouveau
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
Rien. Ticket ouvert le 13/10/2026.
