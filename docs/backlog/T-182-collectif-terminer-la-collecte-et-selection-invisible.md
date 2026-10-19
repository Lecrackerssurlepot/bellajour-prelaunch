---
id: T-182
titre: Le responsable ne peut pas dire « toutes les photos sont là », et l'atelier ne voit pas sa sélection
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Mais sinon, ma question, c'est est-ce que actuellement, il faut, les gens peuvent valider la
sélection en disant « Bon, ben voilà, on a envoyé toutes les photos, voici la sélection, et nous,
on l'a en avance. » Ce qui peut être quand même intéressant. Ou alors, actuellement, il faut juste
attendre en fait, le dernier jour pour que ça se valide. » (19/10/2026)

## Ce que j'ai vérifié (19/10)
- La collecte se ferme à la date de clôture (`etatEffectif`, `etats.ts:79-90`) ; avant, seul
  l'ATELIER peut « Clore maintenant » (`clore_collecte`, `gestes.ts:65-74`, action
  `regler_edition`, `droits.ts:24`). Le responsable n'a aucun geste « c'est complet » : la
  réponse à la question de Mathias est « il faut attendre, ou demander à l'atelier ».
- L'atelier voit déjà chaque photo dès sa confirmation et peut tout télécharger pendant la
  collecte (`PanneauCollecte.tsx`, `lot/route.ts`, aucune garde d'état).
- La sélection (`collectif_photos.preselection`) n'est lue NI par la fiche atelier
  (`admin/collectif/donnees.ts:272`) NI par le téléchargement (`lot/route.ts:55`) : l'atelier ne
  sait pas quelles photos le client a choisies. Le journal dit seulement « une photo ajoutée à la
  présélection du client ».
- `preselection_max` n'est qu'un affichage, jamais appliqué.

## Ce que je propose
Planche 4 du canevas du 19/10 :
1. Sur le tableau de bord du responsable : « Toutes les photos sont là ? » → « Terminer la
   collecte », confirmé en deux temps, qui dit ce qui va se passer. Nouveau droit pour le
   responsable dans `droits.ts` (la matrice du PRD §2 change : l'écrire dans le PRD), geste
   journalisé, ligne dans la boîte de l'atelier. `rouvrir_collecte` reste à l'atelier.
2. Côté atelier : filtre « Sélection du client · N » sur l'onglet Photos, et un dossier
   `selection` dans le téléchargement du lot.
Aucune migration (la date de clôture et les gestes existent).

**À trancher par Mathias** : « Terminer » ferme les liens des participants (proposé), ou
prévient seulement l'atelier ?

## Ce qui a été fait
Rien encore.
