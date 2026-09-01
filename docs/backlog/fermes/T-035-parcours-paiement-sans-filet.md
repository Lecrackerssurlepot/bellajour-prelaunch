---
id: T-035
titre: Le chemin qui encaisse n'a aucun filet automatique
domaine: paiement
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — angle mort identifié le 29/08 en revue de préparation au lancement.
## Ce que j'ai vérifié
`scripts/verif-atelier.ts` couvre les modules purs de l'atelier (transitions, urgence, mails, lot)
sans base ni réseau. Il ne couvre **pas** `src/lib/atelier/paiement.ts`, ni le tri du webhook
partagé, ni `prix.ts` face aux CGV.
Or c'est précisément là qu'un incident réel s'est produit le 24/08 : un album de l'atelier payé en
test a déclenché le mail « bienvenue en prévente », parce qu'un ancien déploiement n'avait pas le
tri. Le correctif est en place ; rien ne garantit qu'il le reste.
## Ce que je propose
Étendre `verif-atelier.ts` — c'est le filet existant, pas un nouveau cadre de test à installer :
1. `estSessionAtelier` / `estChargeAtelier` sur des objets Stripe représentatifs des deux produits,
   plus un troisième sans métadonnées (le cas « orpheline » qui doit être ignoré).
2. `eurosPour(palier)` comparé aux montants de l'annexe des CGV — ce qui aurait attrapé T-006 tout
   seul.
3. La zone de livraison et le comportement quand un pays hors zone se présente.
Aucun appel réseau, aucune clé : uniquement des fonctions pures sur des objets construits à la main.
## Ce qui a été fait
31/08/2026 — confirmé (aucun des trois points n'était couvert), corrigé dans `verif-atelier.ts`,
sans réseau ni clé, et sans toucher au chemin qui encaisse :
1. Le tri du webhook : `estSessionAtelier` / `estChargeAtelier` sur une session atelier
   (`kind: "atelier"`), une session prévente (`offer_type: "founder"`), une orpheline (metadata
   vide et metadata null), un kind approchant. Le cas « orpheline » côté route
   (`estSessionPrevente` + `sessionOrpheline`) vit DANS `api/webhook/route.ts` et n'est pas
   exportable (un fichier route ne peut exporter que ses handlers) : couvert ici par « ni l'un
   ni l'autre produit ne la revendique », le reste est du code de route.
2. `eurosPour` et `palierPourPages` comparés à l'annexe des CGV (20-28 → 30 €, 30-38 → 40 €,
   40-50 → 45 €), bornes comprises, et null hors grille.
3. La zone : `PAYS_LIVRAISON` = exactement BE/FR/LU (CGV 4bis.6). Le « comportement hors zone »
   EST cette liste : Stripe exige une liste explicite de pays et un pays absent n'est pas
   proposable au paiement — il n'y a pas d'autre code à éprouver.
Vérifié au passage : le filet T-038 est bien en place — `paiement.ts` rend `false` sur un échec
d'écriture (lecture `:100-103`, update `:151-154`) et la route webhook rend alors 500
(`route.ts:735-738`), donc Stripe rejoue ; handlers idempotents (verrou `.eq("etat", …)`).
RESTANT (non local, non tranché) : aucun alerting externe ni cron de réconciliation
Stripe ↔ base (comparer les sessions payées aux dossiers en état ≥ payée) — demanderait un
appel réseau Stripe et une décision de Mathias sur le canal d'alerte.

**Fermé le 01/09/2026.** Les trois points de la fiche sont couverts par le harnais. Le reste
n'était pas ce ticket : l'alerting vit dans **T-031**, la réconciliation Stripe ↔ base est
partie dans **T-081**, ouvert ce jour.
