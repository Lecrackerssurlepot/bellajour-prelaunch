---
id: T-182
titre: Le responsable ne peut pas dire « toutes les photos sont là », et l'atelier ne voit pas sa sélection
etat: en cours
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

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 4 telle quelle. **Tranché (D25)** : « Terminer la collecte » FERME les liens des
participants ; l'atelier peut rouvrir tant qu'aucun tour n'est publié.

## Ce qui a été fait
19/10, branche `feat/collectif-terminer-la-collecte` (planche 4, D25) :
- Droit et geste `terminer_collecte` (responsable seulement ; même effet que « Clore
  maintenant » ; refusé à l'équipe, à l'atelier qui « clôt », et sur une collecte déjà close),
  route `/api/collectif/collecte/terminer` (deux temps, écriture conditionnée à l'état lu,
  journal, message dans la boîte de l'atelier, aucun mail). PRD §2 : une ligne ajoutée.
- Tableau de bord du responsable : « Toutes les photos sont là ? » dans la carte des photos,
  « Terminer la collecte », la fenêtre de confirmation de la planche (« Pas encore » / « Oui,
  terminer »), puis « Collecte terminée ».
- Atelier, onglet Photos : « Sélection du client » (nombre, huit vignettes), « Télécharger la
  sélection » (dossier « Sélection du client »), « Collecte terminée par … le … ».
- Harnais : six contrôles, et l'invariant « seul valider_bat est au responsable » mis à jour.
- Vérifié au pilote, AUCUNE écriture : sur « Première édition », la bande, la fenêtre (« les
  12 photos »), puis l'état « Collecte terminée » après la réponse factice (le POST est parti
  vers l'interception, rien n'a été fermé en base) ; sur « Essai révision » (archivée),
  « Sélection du client · 780 photos », huit vignettes, aucune écriture.
Reste : la mise en page de l'onglet Photos de l'atelier suit T-185 (fiche en cartes).
**Non vu en vrai** : une collecte réellement terminée (il faudrait fermer une vraie édition).