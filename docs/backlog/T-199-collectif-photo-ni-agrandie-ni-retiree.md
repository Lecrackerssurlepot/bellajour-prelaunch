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

20/10, lot « w2-atelier » (le CÔTÉ ATELIER de la planche 5 et le réglage de l'ouverture, planche 9B ;
branche `w2-atelier-corbeille-personnes`, rien de commité).
- `PanneauCorbeille.tsx` (+ `corbeille.css`) dans l'onglet Photos de la fiche : la liste de la corbeille (qui l'a
  supprimée, quand, dans combien de jours elle part, en alerte sous trois jours : la réponse du serveur),
  « Restaurer » une photo ou les cochées (un clic, elle revient à sa place), « Effacer maintenant… »
  DÉFINITIF et l'atelier seul, EN DEUX TEMPS : le premier clic envoie `verifier: true` (rien n'est effacé)
  et dit ce qui partirait, le geste armé « Effacer définitivement » n'existe qu'après ; changer la
  sélection désarme. 502 (un objet du coffre a résisté) : l'écran dit « 1 photo résiste : le coffre n'a pas
  répondu, elle reste à la corbeille et la purge du jour réessaiera » et ne retire de la liste que les photos
  effacées. Au-delà de 500 photos cochées, le geste part en plusieurs envois (la route en refuse davantage).
- « Mettre à la corbeille » depuis la fiche : NON ajouté, la fiche n'a pas de grille de photos avec
  sélection (la route sait `supprimer`, `par: "atelier"` : l'écran qui la porte viendra avec la grille).
- « Ouverture du dépôt » dans `FormulaireEdition` (création ET réglages, étape « Le calendrier ») : un jour
  du calendrier Bellajour + une heure en pastille de 0 à 23 (proposée à 8 h, la phrase de la planche 9B),
  convertie par `instantDeParis`, jamais le champ du navigateur ; « Dès la création » le vide ; avertissement
  sur place si elle rejoint la clôture, message du serveur (422 `ouverture_le`) sous le champ ; la frise la
  prend pour premier jalon. Affichée dans « Réglages et liens » (la carte des liens : « Pas encore ouvert :
  le dépôt ouvre le … ») et dans la vue d'ensemble (puce).
- Sans la migration : la corbeille et le champ le DISENT en nommant `supabase/migrations/20261023_…` et ne
  proposent rien (la fiche lit `ouverture_le === undefined`, `/nouvelle` sonde la colonne) ; un 503
  `migration_personnes_absente` reçu quand même est traduit de la même façon, le reste du formulaire reste intact.
- Harnais : bloc « w2-atelier » de `scripts/verif-collectif.ts`. Vu à l'écran (Chrome headless, 1440, 1280 et
  375) sur un faux Supabase local et un faux coffre, toute écriture du navigateur interceptée.
- Reste : la corbeille et les gestes côté responsable et participant (autres lots), la migration.
