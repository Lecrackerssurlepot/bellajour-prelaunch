---
id: T-123
titre: Les photos savent quand et où elles ont été prises, et l'atelier ne le voit pas
etat: en cours
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-21
---
## Ce que Mathias a dit
« Nous faisons nous-mêmes les magazines grâce à l'atelier. J'aimerais qu'on regarde dans le code
de bellajour-project pour y intégrer toutes les IA qui peuvent nous intéresser, notamment la
partie Geoapify qui nous permet d'avoir les données sur les photos. […] Je veux lot A et B, mais
on peut s'inspirer de bellajour-project pour que cela se fasse en back ? Je te trouve la clé
Geoapify. »

Lot A : ce que la photo sait d'elle-même (date, GPS, appareil, dimensions, empreinte, luminance),
sans clé ni coût. Lot B : les lieux (ville, pays) par Geoapify, clé gratuite. Les lots C
(analyse OpenAI Vision, chapitrage) et D (visages Rekognition) sont reportés, C en attente
d'une clé et d'une décision, D tant que le consentement biométrique n'est pas écrit dans
`/composer`.

## Ce que j'ai vérifié
- **L'EXIF est déjà dans le coffre, intact, dans tous les cas.** `composer/depot/reduire.worker.js`
  regreffe le segment APP1 sur chaque JPEG réduit (`grefferExif`) ; les fichiers sous 5200 px et
  les HEIC partent bruts. Le commentaire du worker le dit : « ces métadonnées sont ce qui
  permettra à l'atelier d'ordonner un numéro dans le temps ». Rien ne les lisait.
- **La table `photos` avait 7 colonnes** (migration 20260821 + `vignette_key` 20260830) : ni
  date, ni GPS, ni dimensions. Le worker calcule `largeur`/`hauteur` et les jette.
- **Sonde du 21/09 sur le coffre réel, lecture seule** : sur 60 JPEG récents, 56 datés et 52
  géolocalisés ; tout se lit sur les premiers 512 Ko par Range GET en ~250 ms (date, GPS,
  appareil, dimensions, orientation) ; trois « .heic » sur cinq étaient des JPEG (Safari
  convertit avant d'envoyer) ; les PNG d'iPhone sont des captures d'écran 1170 × 2532.
- **Dans bellajour-project** (`Documents/bellajour/backend/src`) : `process-photo.processor.ts`
  (exifr + sharp), `phash.detector.ts` (DCT, calibré sur 764 photos), `locations/utils/dbscan.ts`
  (150 m, 3 photos), `geoapify-geocoding.adapter.ts` (cache Redis par cellule à 2 décimales,
  ville → district → county). Leur `GEOAPIFY_API_KEY` n'est ni dans `.env.example` ni en local.
- **La politique de confidentialité annonce déjà** Rekognition, OpenAI et Fal.ai comme
  sous-traitants (`src/app/legal/content/confidentialite.ts`) alors que rien ne les appelle :
  à corriger ou à honorer, mais hors de ce ticket.

## Ce que je propose
Tout en back, sans file ni worker (l'atelier n'a ni Redis ni BullMQ, et n'en a pas besoin) :
- **Migration `20260921_atelier_photos_metadonnees.sql`** : 13 colonnes nullables sur `photos`
  (`largeur`, `hauteur`, `prise_le` sans fuseau, `appareil`, `gps_lat/lon`, `empreinte`,
  `luminance`, `metadonnees_le`, `lieu_ville/pays/code_pays`, `lieu_le`). **Mathias l'applique.**
- **Trois modules purs au harnais** : `metadonnees.ts` (date EXIF, appareil, dimensions
  droites, format par octets, capture d'écran, tri, résumé, remarques), `empreinte.ts` (pHash
  DCT porté tel quel, seuil 2, groupes dissous au-delà de 8), `lieux.ts` (DBSCAN haversine,
  plan d'appels : un par lieu dense, un par cellule d'isolées).
- **Deux modules à effets** : `geocodage.ts` (Geoapify, `lang=fr`, 5 s, distingue « rien là »
  de « pas répondu ») et `enrichissement.ts` (Range GET 512 Ko, exifr, sharp sur la vignette,
  écriture avec repli 42703/PGRST204, idempotent par `metadonnees_le`/`lieu_le`).
- **Trois appelants** : `/api/atelier/photos/complete` en `after()` à chaque lot (métadonnées
  seules), `PATCH /api/atelier/numero` en `after()` au consentement (ce qui manque + lieux),
  `/api/admin/atelier/metadonnees` (bouton « Lire les photos ») et
  `scripts/metadonnees-rattrapage.ts` pour l'existant.
- **La fiche** : phrase de résumé sous « Les photos » (période, lieux, doublons, captures),
  bouton « Par date », remarque sur la vignette (doublon à demi éteint, capture, très
  sombre/claire), infobulle complète. **Le brief** gagne « LA CHRONOLOGIE ET LES LIEUX ».
- Les noms de fichiers du lot restent dans l'ordre du dépôt (T-114) : la chronologie est un
  outil de lecture, pas une réécriture du choix du client.

Ce qui attend Mathias : la migration, et `GEOAPIFY_API_KEY` dans Vercel (Production + Preview)
et `.env.local`. Sans la clé, tout marche sauf les lieux, et le bouton les rattrape après.

## Ce qui a été fait
**21/09/2026, branche `feat/photos-metadonnees-lieux`.** Tout ce qui précède est écrit.
`exifr@7.1.3` ajouté. Harnais : 60 assertions de plus, « TOUT PASSE ». tsc et lint verts (25
avertissements préexistants, 0 erreur).
**21/09, plus tard.** Migration appliquée par Mathias (13 colonnes vérifiées en SQL), clé
Geoapify posée dans Vercel (Production + Preview, vérifié par l'API) et `.env.local`. Rattrapage
lancé pour de vrai : 6 dossiers, 503 photos lues, 324 datées, 293 avec GPS, 106 appels Geoapify.
Marjorie (25 dates, 1 GPS sur 99) et Jeanne (rien sur 100) déposent des exports sans EXIF : ce
n'est pas une panne, la fiche dira « sans date ».
**PR #194 créée et fusionnée par Mathias le 21/09**, déploiement Vercel `5cfc8f2` READY sur
`bellajour.fr` (vérifié par l'API). Reste la preuve sur un dépôt réel que la tâche de fond
tourne bien sur Vercel (journal `metadonnees_lues` juste après `photos_confirmees`).
