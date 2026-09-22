# Back-office — /admin

Deux dashboards distincts sous le même mot. Chargé dès qu'on touche l'admin.

- **`/admin`** — prévente, lecture seule (inscrits, crédits, KPI, export CSV).
  Seule écriture tolérée : `admin_last_seen`.
- **`/admin/atelier`** — la table de travail, et elle **écrit, envoie des mails et lance des
  impressions**. C'est un outil de production, pas un tableau de bord.

## Auth

Comptes **nominatifs** : `ADMIN_PASSWORD_MATHIAS`, `ADMIN_PASSWORD_LOUIS`. L'ancien
`ADMIN_PASSWORD` partagé **n'est plus lu** depuis le 31/08/2026 (T-005) ; `PRENOM_COMPTE` garde
la clé `atelier` uniquement pour afficher les vieilles lignes du journal. Cookie HMAC `bj_admin`,
comparaison `timingSafeEqual`, et un frein sur `/api/admin/login` (délai croissant par échec,
T-046 — honnête : `Map` par instance, pas une protection forte). Le nom du compte est
écrit dans `notes.qui`, `numeros.en_charge` et le journal : les gestes sont attribuables.

## Ce qui se casserait sans qu'on le voie

- **`donnees.ts → lireNumeros()` tente le select AVEC la colonne récente et retombe SANS sur une
  erreur 42703.** Sans ce repli, la table de travail entière tomberait pendant la fenêtre entre le
  déploiement et la migration. Idem `lirePhotos()` et `marquerArrivee()`. **Ne pas simplifier.**
- **`loading.tsx` sur la liste et la fiche** : sans eux, Next garde l'écran précédent figé et le
  clic paraît mort. Les silhouettes ont la FORME de l'écran qui arrive.
- **`Rafraichissement.tsx`** rafraîchit chaque minute, RIEN quand l'onglet est caché, rattrapage
  au retour. Jamais `location.reload()` : il perdrait la recherche et le formulaire en cours.
- **La fiche AVERTIT sans bloquer** sur un dépôt non terminé : un coup de téléphone peut justifier
  d'avancer, et une machine qui refuse sans pouvoir écouter finit contournée en SQL.
- **La loupe** (`components/Loupe.tsx`) sert la page cliente ET l'admin : elle pose ses propres
  couleurs sur `.bj-loupe`, sans emprunter aux tokens de l'un ou de l'autre. Le vocabulaire est le
  même des deux côtés (« La couverture », « La quatrième », « Une double page »).
  ⚠️ Elle navigue par LÉGENDE : deux légendes identiques rendent un visuel inatteignable.
- **La grille sert des vignettes** (`urlVignette ?? url`), mais le cadre, la loupe et le
  téléchargement gardent l'ORIGINAL. Les dossiers anciens et les HEIC n'ont pas de vignette.
- **La grille sait ce que les photos savent (T-123, 21/09/2026)** : `lirePhotos()` tente trois
  paliers de colonnes (métadonnées 20260921 → vignette 20260830 → rien), les doublons se
  calculent dans `donnees.ts` sur le dossier entier (`groupesDeDoublons`, module pur), et la
  fiche affiche une phrase de résumé, un bouton « Par date » (état d'ÉCRAN, rien n'est écrit ;
  **le lot téléchargé suit ce bouton**, T-128 : la route reçoit `ordre: "date"` et numérote le
  lot COMPLET dans l'ordre du temps, sinon l'ordre du dépôt, T-114 ; « Par lieu », T-130, fait de
  même par SÉJOUR : un groupe à chaque changement de ville dans l'ordre du temps, « Sans date » en
  queue dans l'ordre du dépôt, un titre `.ate-photos-lieu` par groupe ; « Sans date : voisines », T-131, cale chaque sans date
  près de sa voisine de dépôt, la route reçoit `sansDate: "voisines"`), **le jour sur chaque vignette
  datée** (T-129, même forme que le nom du fichier) **et le lieu dessous** (T-132, ville sinon pays) et une remarque par vignette (doublon à demi éteint,
  capture d'écran, très sombre, très claire). **Ce sont des remarques, jamais des exclusions.**
  Le bouton « Lire les photos » n'apparaît que s'il reste quelque chose à lire ; en démo, jamais.
- **« Télécharger le lot »** ouvre le sélecteur de dossier AVANT tout `await` : Chrome exige une
  activation utilisateur fraîche. Dépend du CORS du bucket R2 en GET.
  Le dossier écrit porte l'ordre choisi (« … (par date) », T-133) : le même ordre réécrit le même
  dossier, un autre ordre en fait un autre, sinon deux numérotations se mêlent.
- **Le tag rouge « ne reçoit pas »** est le seul marqueur qui dise qu'un dossier d'apparence
  normale est INJOIGNABLE (journal `email_rebond`, posé par le webhook Brevo). Lu dans la MÊME
  requête que les remboursements, sans colonne ni migration. La fiche en fait un bandeau qui
  rappelle le téléphone ; la page santé le remonte en ROUGE **sans borne de date** — un rebond ne
  se périme pas au bout d'une semaine, contrairement aux mails en échec.

- **« Relancer » n'est PAS une transition** (T-109, 11/09/2026). Les sept gestes d'`ActionRapide`
  viennent de `transitions.ts` et changent l'état ; la relance redit ce qu'on avait déjà dit et
  ne touche à rien. Elle a donc son composant (`Relance.tsx`) et sa route, mais elle garde la
  règle qui compte : **jamais d'un seul clic**. Le bouton éteint dit POURQUOI au survol et dans
  son panneau — un bouton mort sans explication finit contourné en SQL — et il n'existe pas du
  tout là où une relance n'a aucun sens (`relance.pertinent`).
- **La colonne « Dernier mot » a remplacé « Ouvert ».** La date d'ouverture ne décidait de rien
  (elle est déjà dans le délai, dans la pile et sur la fiche) ; « il n'a rien reçu depuis six
  jours » décide de la journée. Elle est lue dans `mails_envoyes`, DÉJÀ chargé pour la projection
  des actions : aucune requête de plus. La date d'ouverture reste en `title`.
- **La boîte du jour « Depuis hier »** (`Arrivees.tsx`, règle pure `lib/atelier/arrivees.ts`,
  11/09/2026) a remplacé les quatre compteurs du flux (archive/admin-flux-2026-09). Une ligne
  par dossier, l'événement le plus récent gagne, et **la ligne disparaît d'elle-même** dès que la
  balle n'est plus chez nous : rien à cocher. Aucun bouton, par décision de Mathias. Fenêtre :
  hier 00:00 heure de Paris, le lundi depuis vendredi. Elle lit le journal dans LA MÊME requête
  que le fil d'activité (`chargerJournalRecent`, plafond 200 lignes) : aucune latence de plus.
- **La colonne « Prochaine étape » a remplacé « État »** sur la liste (pas sur la fiche ni la vue
  tableau). Pastille de camp + geste, calculés par `prochaineEtape` (`lib/atelier/prochaineEtape.ts`)
  avec **les mêmes options qu'`urgencePour`** : la pastille et la pile ne peuvent pas se contredire.
  La fiche lit la même table (`parcours.ts` n'a plus de `SUITE` à lui). Les retards et les à-faire
  se lisent sous un seul groupe « À nous » : un GROUPE D'AFFICHAGE, `urgence.ts` n'a pas bougé.
- **Archiver, récupérer, supprimer** (T-113, 14/09/2026 ; `Archivage.tsx`, règle pure
  `lib/atelier/archive.ts`, colonne `numeros.archive_le`, migration 20260914). Archivé = hors de la
  table de travail (sauf le filtre « Archivés »), de la relève des mails, de la page cliente et de
  l'espace compte ; l'état ne change pas, tout revient à « Récupérer ». **La suppression définitive
  ne part QUE d'un dossier archivé** (deux gestes), jamais pendant une impression (`en_production`,
  `expediee`), et efface le coffre R2 (`supprimerPrefixe`, préfixe `numeros/<id>/`) AVANT la ligne :
  si un objet résiste, rien n'est retiré en base (502). Le paiement Stripe et la facture ne bougent
  pas, l'écran le dit avant le clic. Sans la migration, les boutons répondent 503 et le disent.
- **Le dépôt d'un PDF d'impression le RECOUPE avant le coffre** (T-121, 18/09/2026, `preparerPdf.ts`) :
  l'atelier dépose l'export Canva brut (doubles pages, marge de traits, couverture sans dos) et le
  navigateur en fait les pages simples et la feuille enveloppante que Cloudprinter attend ; la phrase
  sous le cadre dit ce qu'il a fait, un export illisible est refusé avec la case Canva à cocher.
  Le contrôle technique de la carte « Fichiers d'impression » ne lit que `impression_fichiers`, donc
  APRÈS la commande : avant, c'est le dry-run de « Envoyer à l'impression » qui mesure et refuse.
- **Après le PUT, la fiche CONTRÔLE LES BORDS du PDF envoyé** (T-121, 21/09/2026, `rendreBords.ts`
  + `@/lib/atelier/bords`) : pdf.js rend chaque page à 100 dpi dans le navigateur (44 pages ≈ 40 s,
  l'écran dit « page i sur n »), et la phrase sous le cadre nomme la page, le bord, l'endroit et la
  cote d'un fond perdu court. C'est une REMARQUE, pas un refus : l'atelier juge. pdf.js et son
  worker vivent dans `public/pdfjs/` (copie de `node_modules/pdfjs-dist/build`, même version que
  `package.json`) et se chargent à l'exécution, hors bundler ; à mettre à jour ensemble.
  ⚠️ Pour tester la fiche en local, l'onglet doit être VISIBLE (Chrome headless ou fenêtre au
  premier plan) : un onglet caché n'hydrate jamais la fiche en flux, sans aucune erreur.
- **`chargerListe` fait partir ses quatre lectures ensemble** (journal, activité, dossiers vus,
  mails partis). Seul `lireNumeros` reste seul et avant : tout le reste dépend de ses ids.
  Les enchaîner coûtait quatre latences à chaque ouverture ET à chaque rafraîchissement, donc
  toutes les minutes.

## Écrans

`page.tsx` (liste triée par urgence) · `[token]/page.tsx` (fiche + frise des 8 jalons + actions
armées en deux temps + carnet de l'éditeur) · `metriques/` · `sante/` (**le seul endroit qui
montre un mail sans template**) · `demo/` (fixtures, sans base).
`cockpit/` (17/09/2026) : quand faut-il avoir lancé le développement ? Lit UNIQUEMENT l'agrégat
`weekly_metrics` et `cockpit_settings` (jamais les commandes brutes) ; le modèle est pur
(`@/lib/cockpit/modele`), rejoué par les curseurs côté client ; le job du lundi (`@/lib/cockpit/job`)
réécrit toutes les semaines complètes, idempotent. L'origine chaud/froid se pose sur la fiche
(`Origine.tsx`) ; un fondateur est chaud d'office ; l'inconnu est compté À PART, jamais deviné.
`demo/cockpit` montre l'écran sur une série inventée.
