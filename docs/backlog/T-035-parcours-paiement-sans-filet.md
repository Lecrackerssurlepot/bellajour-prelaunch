---
id: T-035
titre: Le chemin qui encaisse n'a aucun filet automatique
domaine: paiement
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
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
—
