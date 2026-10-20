---
id: T-199
titre: Le responsable ne peut ni agrandir, ni signaler, ni retirer une photo, et personne ne peut supprimer une photo déposée
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- La route de signalement existe (`src/app/api/collectif/photos/marquer/route.ts:46-50`) mais
  aucun bouton de l'espace client ne l'appelle.
- Aucune vue agrandie dans la grille du responsable, aucune suppression d'une photo (la seule
  suppression est automatique, au-delà de 50 Mo, `depot/complete/route.ts:84`).
- Scénario : une photo déplacée arrive d'un participant ; le responsable ne peut rien en faire
  qu'écrire à l'atelier.

## Ce que je propose
Agrandir et « Ne pas publier » chez le responsable (le lot les préfixe déjà
« A-NE-PAS-PUBLIER »). Supprimer une photo, côté atelier seulement, en deux temps et journalisé :
c'est une suppression de données, Mathias tranche.

## Ce qui a été fait
20/10, lot « w1-fondations » (le SERVEUR des planches 3, 5 et 7, aucun écran ; rien de commité).
Décisions de Mathias du 20/10 : supprimer = corbeille 30 jours, restaurable par le responsable et
l'atelier ; « Effacer maintenant » à l'atelier seul ; la corbeille invisible au lien d'équipe.
Contrat : `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md`.
- Migration écrite, NON appliquée : `supabase/migrations/20261023_collectif_personnes_corbeille.sql`
  (`collectif_photos.supprimee_le` / `supprimee_par`, la vue de résumé sans la corbeille).
- Une photo à la corbeille disparaît de TOUTES les lectures (grille, arrivées, sélection, fin de
  collecte, tableau de bord, fiche, lot, doublons, plafonds, album) par `lireHorsCorbeille`, qui se
  replie sans la colonne. Piège mesuré sur la vraie base : un compte `head` filtré sur une colonne
  absente rend une erreur SANS code ; ces comptes passent en GET `limit(0)`.
- Responsable : `POST /api/collectif/photos/corbeille` (lister, supprimer n'importe quelle photo,
  restaurer) ; « Ne pas publier » et « Ma sélection » sur les photos cochées (`marquer` avec
  `photoIds`). Atelier : `…/admin/collectif/editions/[id]/corbeille` (+ effacer pour de bon en deux
  temps). Participant : `POST /api/collectif/depot/supprimer`, SEULEMENT les photos de CE téléphone
  (décision de sécurité : l'adresse n'est pas vérifiée) ; sa place se libère.
- L'album du lien : `POST /api/collectif/depot/album` (prénoms seulement, « Ne pas publier » reste,
  lecture après la clôture). Décision de sécurité de ce lot : seules les photos envoyées sous
  l'accord du 20/10 (qui le dit) entrent dans l'album des autres.
- Purge quotidienne après la relève de l'atelier (aucun cron de plus) : coffre d'abord, puis la
  ligne SUPPRIMÉE (pas anonymisée, justifié dans `corbeilleServeur.ts`).
- Modules : `corbeille.ts`, `album.ts` (purs), `corbeilleServeur.ts`, `horsCorbeille.ts`. Harnais :
  section « w1 ».
- Reste : les écrans (agrandir, la barre d'actions, la corbeille, l'album), l'application de la
  migration par Mathias, la phrase de l'accord du lien général à relire (texte légal).
