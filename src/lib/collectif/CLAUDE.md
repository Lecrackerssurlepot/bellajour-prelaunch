# L'Édition collective — le second produit (B2B)

Chargé dès qu'on touche un module de `src/lib/collectif/`. Le PRD est
`docs/produit/PRD-edition-collective.md` ; il fait foi sur les maquettes
(`docs/produit/collectif/maquettes/`). Les tickets sont T-139 (phase 0) à T-146 (phase 7).

## La règle d'or : le B2C ne bouge pas

Un client B2B (entreprise, école) ouvre une **édition** d'un ou plusieurs **magazines**. Tout est
à part : tables `collectif_*`, lib `src/lib/collectif/`, routes `/api/collectif/*` et
`/api/admin/collectif/*`, pages `/edition/[token]`, `/depot/[token]`, `/admin/collectif/*`.

- **Jamais d'écriture dans `numeros`, `photos`, `evenements`, `mails_envoyes`.** Les trois
  dernières ont une clé étrangère vers `numeros(id)` : une ligne d'édition y échouerait, et
  comme les helpers B2C (`logEvenement`, `enrichirPhotos`, `envoyerMailAtelier`) ne lèvent jamais
  d'exception, la donnée serait perdue EN SILENCE. Le harnais refuse qu'un module d'ici importe
  ces helpers ou nomme ces tables.
- **On importe les cœurs purs du B2C, on ne les paramètre pas.** Réutilisés tels quels :
  `token.ts`/`tokenForme.ts`, `secret.ts`, `r2.ts` (`signerPut`, `signerGet`… prennent n'importe
  quelle clé ; seules nos clés sont dans `cles.ts`), `formats.ts`, `empreinte.ts`,
  `metadonnees.ts`, `lieux.ts`, `geocodage.ts`, `lirePhoto`/`lireDepuisCoffre`
  (enrichissement.ts), `suivi.ts`, `lot.ts`, `brevo.ts`. Ce qui écrit en base a son voisin ici
  (journal, enrichissement, verrou de mails). Paramétrer un module du tunnel pour économiser cent
  lignes, c'est risquer de vraies clientes.
- **Le moteur d'envoi des photos est à part** (`depot/`, phase 3). Le moteur B2C garde une copie
  IndexedDB de chaque photo et efface celles des autres dossiers (`purgerAutresTokens`) : à
  2 000 photos le quota saute, et un moteur partagé effacerait la reprise d'un dépôt B2C en cours.
  Ici la reprise passe par `cle_fichier` côté serveur. `pool.ts` et `reduire.worker.js` (la
  réduction et la vignette 320 px) s'importent tels quels.

## Les fichiers purs (aucun accès base, réseau ou environnement)

- **`etats.ts`** — sept états, et **`etatEffectif`** : une édition `preparation` dont la clôture
  est passée EST en `composition`, sans cron. Tout écran, tout verrou, tout geste lit l'état
  effectif ; lire `edition.etat` brut, c'est laisser le lien participants ouvert après la
  clôture. ⚠️ **`lireInstant` n'accepte que l'ISO 8601 AVEC fuseau** : V8 lit « le 4 octobre »
  comme 2001 (prouvé le 13/10), et une date sans fuseau à l'heure de la machine. L'écran convertit
  l'heure de Paris. L'état d'un MAGAZINE est dérivé (`etatMagazine`), jamais stocké.
- **`gestes.ts`** — LA table des gestes (patron d'`ACTIONS`, atelier/transitions.ts). Ajouter un
  geste = une entrée. **`qui` n'est pas déclaré** : il vient de `DROITS` par l'`action` du geste.
  Choix validés par Mathias le 13/10 : `rouvrir_collecte` seulement sans tour publié ; publier un
  tour seulement après la clôture et jamais pour un magazine validé ; valider le BAT exige une
  couverture ou « Sans préférence ». L'archive est un MARQUEUR (`archive_le`), pas un état.
  `livraison` se FUSIONNE dans le jsonb, ne le remplace jamais (l'adresse y vit).
- **`droits.ts`** — la matrice du PRD §2, ligne à ligne. **Le lien équipe n'écrit RIEN.** Chaque
  route publique qui écrit appelle `peut(role, action)` avant tout ; le harnais relit chaque
  `route.ts` de `api/collectif` pour le vérifier. `roleDuToken` compare à durée constante.
  Les surfaces : `espace` = responsable + équipe, `depot` = participant SEUL. ⚠️ Une **clé de
  provenance** (`?p=`) lève le plafond par personne : 22 caractères aléatoires au moins, jamais
  un mot (la maquette montrait `/photographe`).
- **`verrous.ts`** — le menu (sept entrées, ordre des maquettes) et `verrousPour(etatEffectif)`.
  Lu par le menu ET par la page : une URL tapée à la main sur une étape verrouillée affiche le
  même message, jamais une erreur.
- **`plafonds.ts`** — trois chiffres, aucun deviné. L'atelier échappe à tout ; le responsable et
  les provenances `sans_plafond` n'ont pas de plafond PAR PERSONNE mais le total les compte ; le
  participant a les deux, tenu PAR APPAREIL (un frein, pas une garantie). **Un plafond `null`
  FERME le dépôt** (`plafond_non_regle`) : on ne devine pas. Le plafond atelier qui descend
  ramène le curseur du client dans la même écriture (sinon la contrainte de la base refuse).
- **`cles.ts`** — tout sous `collectif/`, jamais `numeros/`. Chaque fabrique refuse un id qui
  n'est pas un uuid. Les pages d'un tour sont rangées par l'**id** du tour, pas son numéro (deux
  magazines ont chacun leur tour 1 : écart corrigé du PRD §6.1).
- **`types.ts`** — le miroir des treize tables et le vocabulaire. `TYPES_NOTE` est une liste
  EXTENSIBLE : texte libre en base, une ligne ici pour un nouveau type.
- **`interrupteur.ts`**, **`migration.ts`** — voir plus bas.

**Phase 1 (13/10/2026), les purs de l'atelier :**
- **`dates.ts`** — l'heure de PARIS, explicitement : `instantDeParis` (le champ `datetime-local`
  → instant ISO, `null` pour l'heure qui n'existe pas au passage à l'heure d'été),
  `versChampParis`, `formaterInstantParis`. Jamais `new Date(champ)` : il lit l'heure de la
  machine, et ni celle de Vercel (UTC) ni celle de l'atelier ne sont forcément Paris.
- **`saisie.ts`** — la règle de création ET de réglage d'une édition (exigés : organisation,
  événement, registre, e-mail du responsable, un magazine ; tout chiffre vide reste `null` ;
  `rdv_url` en https seulement ; `suggestionEmail` suggère, ne bloque pas ; la case
  « démonstration » ne s'écrit jamais d'ici). `planMagazines` : renommer toujours, ajouter à la
  suite, retirer SEULEMENT le dernier et seulement s'il est vide : les rangs ne se renumérotent
  jamais (le client lit « magazine 2 »).
- **`styles.ts`** — la forme d'un style (palettes de 4 couleurs, deux typos + un échantillon en
  IMAGE, couvertures, TOUJOURS cinq doubles pages types), sa saisie (le slug ne change jamais,
  une image d'un autre style est refusée), `manquesPourPublier` (le serveur refuse de publier
  un style incomplet), `nomImageStyle` (nom versionné, jamais d'écrasement).
- **`prochaine.ts`** — la prochaine étape et son camp, lue par la liste ET la fiche.
- **`recit.ts`** — le journal en français ; **jamais un token** (un lien régénéré se dit par son
  rôle, pas par sa valeur). **`liens.ts`** — les trois liens sur l'origine de la requête
  (localhost en local).

Les modules à effets : `acces.ts` (la porte serveur des liens), `sante.ts` (la seule sonde),
`journal.ts` (`collectif_evenements`, rend un booléen que la route LIT).

⚠️ **Les images d'un style passent PAR LE SERVEUR, pas en PUT signé vers R2** (phase 1). Le
CORS du bucket n'autorise que bellajour.fr, *.vercel.app et localhost:3000 : depuis le local
de recette (3006) un PUT direct échouerait sans le dire. Le navigateur réduit l'image
(`reduireImage.ts`, 2400 px, WebP sinon JPEG, sous 4 Mo) puis la route l'écrit avec
`ecrireObjet`. Les PHOTOS de la phase 3 (des milliers, souvent lourdes) ne pourront pas suivre
ce chemin : elles iront en PUT signé, et l'origine de recette devra entrer dans le CORS.

**Phase 2 (13/10/2026), l'espace client :**
- **`espace.ts`** (pur) — les cinq étapes du client par leur NOM (jamais « N sur M », PRD §12.11
  ouvert), `joursAvant` en jours CALENDAIRES de Paris, `parler(registre)` pour vous / tu,
  `contenusAEnvoyer`. **`messages.ts`** (pur) — 3,5 s, `fusionnerMessages` sans doublon.
  **`documents.ts`** (pur) — types de documents, nom de téléchargement en ASCII.
- **`messagerie.ts`** (effets) — UNE façon de lire, écrire, marquer lu, pour le client et pour
  l'atelier. **`reponses.ts`** — 404 identique pour inconnu / archivé / fermé, 503 migration,
  403 `lecture_seule`.
- ⚠️ **Les routes publiques sont en POST, token dans le CORPS** (`/api/collectif/messages*`,
  `/api/collectif/plafond`) : jamais un token dans une URL que les journaux garderaient.
- ⚠️ **« Marquer lu » se fait par un EFFET** (`useMessagerie`), jamais au rendu : un
  préchargement de `<Link>` exécute la page. Le lien d'équipe ne marque rien.
- La coquille (`edition/[token]/layout.tsx`) lit l'édition par `cache` (une requête pour layout
  ET page) ; l'état du tiroir et de la bulle d'un verrou est rattaché au chemin, il se referme
  seul à la navigation (aucun `setState` dans un effet).

**Phase 3 (13/10/2026), la collecte :**
- **`depot.ts`** (pur) — `cleFichier` (nom|taille|date de modification de l'ORIGINAL),
  `lireDeclaration`, `planDeclaration` (déjà là / reprise sur la MÊME clé R2 / nouvelle /
  refusée ; seules les nouvelles consomment la place), `compteDansPlafond` (une déclaration
  morte depuis 2 h ne bloque plus personne). **`doublons.ts`** — par trois tronçons (principe
  des tiroirs), mêmes groupes que `groupesDeDoublons` : le harnais le prouve sur 25 lots.
  **`grille.ts`** — filtres, jour d'une photo lu SANS fuseau, « qui a déposé ».
- **`collecte.ts`** (effets) — cookie httpOnly `bj_depot_appareil` (le plafond PAR APPAREIL,
  un frein honnête), comptes, reprise. **`enrichissement.ts`** (effets) — le voisin de
  `enrichirPhotos` : importe `lireDepuisCoffre`, `planGeocodage`, `geocoderInverse`, écrit dans
  `collectif_photos`. Le harnais interdit d'importer `enrichirPhotos`, `geocoderNumero`,
  `logEvenement`, `envoyerMailAtelier`.
- ⚠️ **Le moteur d'envoi** (`edition/_composants/depot/moteur.ts`) ne garde RIEN dans le
  navigateur et ne tient jamais plus de 8 photos réduites en mémoire. Ne pas y ajouter une copie
  IndexedDB « pour la reprise » : c'est exactement ce qui fait sauter le quota à 2 000 photos.
- **Les HEIC (T-150, 15/10)** : Safari décode le HEIC et le worker du B2C fait sa vignette ;
  Chrome, Firefox et Android échouent. Seulement alors, `depot/heic.ts` confie la photo à
  `public/heic/vignette-heic.worker.js`, qui charge libheif en WebAssembly (`libheif-js` 1.19.8,
  LGPL, copie NON MODIFIÉE à côté de sa licence, chargée à la première photo seulement) et rend
  une vignette de 320 px. L'ORIGINAL part toujours tel quel. L'empreinte (doublons) et la
  luminance se calculent ensuite sur la vignette, comme pour un JPEG. Le moteur du B2C n'est pas
  touché. ⚠️ `is_primary()` n'existe pas dans ce libheif-js : on prend la plus grande image. Les
  HEIC envoyés avant : `scripts/collectif-heic-rattrapage.ts`.
- ⚠️ **Le CORS du coffre** n'accepte que bellajour.fr, www, *.vercel.app et `localhost:3000`
  (vérifié le 13/10 par une requête OPTIONS) : le local de recette des photos tourne donc sur
  3000 (`.claude/launch.json` « Next.js prod 3000 collectif »).

**Phase 4 (13/10/2026), le style :**
- **`brief.ts`** (pur) — **D24 (14/10) : le brief se compose PIÈCE PAR PIÈCE, de n'importe quel
  style** (elle remplace la règle du 08/10 « l'intérieur suit le style »). `compositionDu` est LA
  lecture d'un brief (les colonnes de D24, sinon `style_id`) ; `lirePiece` (palette, typographies,
  double page, cinq au plus tous styles confondus), `lireChoixStyle` (prendre le style EN ENTIER :
  palette, typographies, doubles ; les couvertures restent), `basculerCouverture` (plafond
  `couvertures_aimees_max`, `null` = refusé), `grouperParChoix` (le choix, ce qui va avec, le
  reste). `briefModifiable` : seulement en `preparation`. Changer un brief validé le remet à
  valider. `styleVisible` : une école voit les styles « école » et « tous ».
- Une seule route, `/api/collectif/brief`, une action par geste ; le droit change selon
  l'action (`valider_brief` pour valider ou rouvrir, `choisir_style` pour le reste).
- Le mur et la page d'un style lisent `chargerMur` (styles PUBLIÉS et visibles, images signées
  une heure). Un style dépublié disparaît du mur ; un brief qui le nomme reste lisible côté
  atelier (la fiche lit le style par son id, publié ou non).

**Phase 5 (13/10/2026), le bon à tirer :**
- **`bat.ts`** (pur, importable navigateur) — ⚠️ **L'APPARIEMENT DE DEUX TOURS LIT LE TEXTE
  D'ABORD.** Mesuré le 13/10 : deux pages de même gabarit ont des empreintes d'image à 0-4 bits
  même quand leur contenu diffère, et une page dont la photo a changé s'éloigne de 20-28 bits.
  L'image seule confondait les unes et perdait l'autre. `coutPaire` : la part de mots communs
  (pdf.js lit le texte, `motsUtiles` retire titre courant et folio) ; l'image seulement pour une
  page sans texte ; `apparierPages` aligne dans l'ORDRE (un « diff »). Ne pas revenir à un
  appariement glouton par empreinte. ⚠️ **Les zones** (`zonesModifiees`) comparent des gris de
  240 × 340 et marquent une cellule aussi sur quelques pixels FRANCHEMENT changés : à 120 px ou
  à la seule moyenne, un mot corrigé passait inaperçu. `rectRognage` coupe au format fini
  (TrimBox lue par pdf-lib). `lirePagesTour` RECALCULE chaque clé : le navigateur ne peut faire
  entrer dans un tour qu'un emplacement de CE tour.
- **`tours.ts`** (effets) — une seule façon de compter les tours publiés et de trouver le tour
  précédent d'un brouillon (le dernier PUBLIÉ avant lui, jamais un autre brouillon).
- Le PDF est rendu dans le NAVIGATEUR de l'atelier (`admin/collectif/[id]/bat/rendreTour.ts`) :
  le PDF source, les pages et leurs vignettes partent en PUT signé (le CORS du coffre doit
  accepter l'origine : bellajour.fr, *.vercel.app, localhost:3000) ; les gris passent par le
  serveur (gzip). Le PDF source et les gris ne sont JAMAIS servis au client : le harnais
  vérifie qu'aucun fichier de `/edition` ni route publique ne les nomme.
- Un seul brouillon de tour par magazine (`ouvrir_tour` le rouvre). Les propositions de
  couverture vivent sur le PREMIER tour ; leur nombre est un réglage de la fiche, `null` refuse
  la publication. Valider exige une couverture ou « Sans préférence » ET aucune note restée en
  brouillon.
- Route client `/api/collectif/bat` : une action par geste, le droit dépend de l'action ; tout
  est refusé hors de l'état `bat` et sur un magazine validé.

**Phase 6 (13/10/2026), parler à l'atelier et la livraison :**
- **`livraison.ts`** (pur) — ⚠️ **Pas de suivi en direct, pas de créneaux, pas de montant**
  (PRD §0.5) : le colis, c'est le transporteur, le numéro et le lien que `suivi.ts` sait
  construire ; le rendez-vous, c'est le lien Google de la fiche ; une proposition
  complémentaire est un document de l'atelier, et « Accepter » ne paie rien (message, journal,
  mention sur le document ; le harnais refuse un « € » dans ces fichiers). Les dates des étapes
  sont LUES (journal, `livraison`, `bat_valide_le`), jamais estimées. Le jour prévu est un
  `AAAA-MM-JJ` sans heure : il se lit sans fuseau (`formaterJour`).
- Une demande de modification devient un MESSAGE : l'atelier la lit où il lit tout le reste
  (compteur de non-lus compris). Possible jusqu'à la validation du bon à tirer.
- L'acceptation d'une proposition fait foi dans le JOURNAL (`proposition_acceptee`,
  `payload.document`) : une seconde acceptation est refusée.
- `livraison` (jsonb) se FUSIONNE, jamais ne se remplace : l'adresse et le jour prévu viennent
  du panneau de la fiche, le transporteur et le suivi du geste « Marquer expédiée ».

## L'interrupteur et la migration

- **`COLLECTIF_OUVERT`** (lu à chaque appel, une valeur incomprise FERME) : sans lui,
  `/edition`, `/depot`, `/admin/collectif` et toute route `collectif` répondent 404, et le lien de
  la table de travail disparaît. `notFound()` est levé dans les LAYOUTS, avant toute silhouette :
  c'est un vrai 404 (vérifié au `curl -I` le 13/10). Chaque page du B2B est `force-dynamic`, sinon
  la valeur serait gelée au build.
- **La migration `20261013_collectif.sql` est appliquée par Mathias.** Elle est atomique
  (`begin`/`commit`) : treize tables ou aucune. Il n'y a donc **aucun repli** : la vraie lecture
  échoue en `PGRST205`/`42P01` (`tableAbsente`), une route répond un vrai **503
  `migration_collectif_absente`**, une page affiche l'écran « Migration collectif absente » (une
  page App Router ne peut pas répondre 503). On ne sonde pas avant chaque requête ; seule
  `/admin/collectif` interroge les treize tables pour nommer celle qui manque.
- **Un tour publié est figé PAR LA BASE** (trigger `collectif_tour_fige`, et ses couvertures) :
  un nouveau PDF fait un nouveau tour. Conséquence voulue : une édition avec un tour publié ne se
  supprime pas, elle s'archive.
- **Aucun chiffre par défaut en base** (plafonds, tirage, tours, couvertures, pagination) :
  `null` s'affiche `[À FIXER]`. Les décisions ouvertes sont au PRD §12.

## Les tokens

Trois tokens au porteur par édition (`token_responsable`, `token_equipe`, `token_depot`), même
forme que `numeros.token` (32 caractères). `acces.ts` filtre la forme AVANT toute requête, et
répond `introuvable` à l'identique pour un lien inconnu, archivé, ou tapé sur la mauvaise porte
(pas d'annuaire). Les layouts posent `noindex` et `referrer: no-referrer` ; l'analytique masque
`/edition/<token>` et `/depot/<token>` (`src/lib/analytics/chemin.ts`).

## Les écrans

Client : `.bj-atelier` + scope propre (`.ec-espace`, `.ec-depot`), Cormorant Garamond **400**
(jamais 500 : T-059) et DM Sans. Toute classe préfixée `ec-` et écrite sous son scope : une
feuille chargée ne se décharge jamais en navigation client. Admin : PORCELAINE depuis le 15/10
(les jetons crème redéfinis dans `admin.css`, voir `src/app/admin/CLAUDE.md`), classes de la
table de travail. Masculin générique à l'écran (« le responsable »), même si le PRD écrit « la
responsable ».

## La révision du 13/10 (PRD §14, T-147) : l'espace devient un logiciel

Le §14 du PRD prime sur les §4 à §7. Ce qui doit tenir :
- **Jour / nuit.** `data-ec-mode` sur la racine (`RacineEspace`), cookie d'affichage `bj_ec_mode`
  (`affichage.ts`, `path=/edition`) lu par `edition/layout.tsx` : la page arrive dans le bon mode,
  sans éclair. Des jetons SÉMANTIQUES (`--ec-bg`, `--ec-panel`, `--ec-surface`, `--ec-text`,
  `--ec-accent`, `--ec-glass`…) redéfinis par mode dans `espace.css` ; les anciens noms
  (`--ec-blanc*`, `--ec-orange*`, `--ec-filet*`) sont des alias. ⚠️ **Aucune couleur écrite en
  dur** hors des blocs de jetons (le harnais relit chaque CSS de `edition/[token]` et refuse un
  hexadécimal dans un `.tsx`). Les pages de magazine (BAT, QR) gardent leurs vraies couleurs dans
  les deux modes : jetons FIXES `--ec-page`, `--ec-encre`, `--ec-noir-rgb`. Pas de `data-theme`
  (mort, `src/app/CLAUDE.md`).
- **Aucune page ne défile** au-dessus de 860 px : `.ec-coquille` fait `var(--app-height)`, chaque
  écran est `.ec-ecran` (en-tête `EnTeteEcran` de 68 px, puis un corps en `min-height: 0`), et
  seules les zones `.ec-defile` défilent. Sur téléphone, la page défile de nouveau (`.ec-defile`
  repasse en `overflow: visible`), menu en tiroir. Un `IntersectionObserver` qui charge par pages
  observe SA zone (`root`), nul sur téléphone (Photos).
- **Les fenêtres sont en verre** (`Fenetre`, `cote` pour le panneau latéral) et couvrent la
  colonne de contenu, pas le menu.
- **Porcelaine le jour, Charbon la nuit, du verre partout (15/10, maquettes « direction
  visuelle » validées par Mathias).** La nuit n'est plus un noir pur (`--ec-bg: #17181c`, texte
  `#ecedf0` : 15,2 : 1 ; légendes 5,5 : 1, mesurés) ; le jour n'est plus beige (`#f3f4f7`, le bleu
  de Bellajour). La FORME est en jetons communs : `--ec-r-panneau` 28, `--ec-r-carte` 24,
  `--ec-r-bloc` 16, `--ec-r-champ` 14, `--ec-flou`, `--ec-carte` / `--ec-carte-bord` /
  `--ec-ombre-carte` (un panneau de verre), `--ec-actif` (l'onglet ou l'élément ouvert : une
  pilule claire), `--ec-creux` (le fond d'une pilule segmentée). La coquille FLOTTE : marge de
  16 px, menu de verre arrondi, deux taches floues derrière (`.ec-coquille::before/::after`,
  `--ec-aurore-*`). ⚠️ **Plus de traits entre les sections** : un bloc nouveau est un panneau de
  verre posé sur le fond (ou une ligne claire arrondie dans un panneau), jamais une zone séparée
  par un `border-bottom`. Un panneau de verre qui contient une zone `position: sticky` repasse en
  `overflow: visible` sur téléphone (sinon le collant ne colle plus).
  **Les maquettes font foi jusque dans le détail** (retour du 15/10 au soir) :
  - les lueurs sont à leur place : la nuit, cuivre en haut à DROITE ; le jour, bleu en haut à
    gauche ;
  - le tableau de bord est une grille 1 / 1,08, avec « À envoyer » sous le style et le message
    sous les photos ;
  - l'encart Style dit « Fait », montre l'éventail, une tuile par magazine et « Modifier » ;
    l'éventail est TOUJOURS Lisbonne, Aussie et la Côte d'Azur (`EVENTAIL`, couvertures de
    Bellajour dans `public/images/v2/accueil/`), choix de Mathias du 15/10 contre les couvertures
    d'essai du mur ; les tuiles disent le vrai style ;
  - une ligne de dossier porte sa vignette ;
  - un album porte son nombre de photos sur la couverture ;
  - « Vos dossiers » et « Les participants » montrent dessous les huit dernières arrivées
    (`ARRIVEES`, jamais une page de grille).
  ⚠️ **Les unités de conteneur (`cqh`) valent 0** dans une carte sans hauteur fixe (mesuré à
  1000 et 390 px) : sous 1100 px, l'éventail passe en tailles fixes.
  **Règle de Mathias (15/10)** : à partir de TROIS contenus à envoyer (`LIGNE_LONGUE`), la ligne
  « À envoyer » prend toute la largeur pour qu'on les voie tous, et le message de l'atelier
  passe DESSOUS.
  ⚠️ **Une fenêtre (`Fenetre`) s'ouvre toujours dans `.ec-contenu`, par un portail.** Un panneau
  de verre (`backdrop-filter`) devient le bloc conteneur de tout ce qui est positionné dedans :
  ouverte en place, la fenêtre restait enfermée dans son encart, inutilisable (vu le 15/10 sur
  « À envoyer »). Ne pas retirer le portail.
- **Le plafond appartient au LIEN** (`plafond_par_personne`, compté par appareil SUR ce lien :
  `compterPourPlafond(…, provenanceId)`). « Sans limite » = `sans_plafond`. Un lien d'avant la
  révision garde l'ancienne règle (`plafondParticipant`). Le curseur va de 5 à
  `plafondLienMax` (100, ou le plafond de l'atelier s'il est plus bas).
- **La migration `20261014_collectif_revision.sql`** ajoute des COLONNES à des tables qui existent :
  la LECTURE se replie (`colonneAbsente`, 42703 / PGRST204), l'ÉCRITURE qui en a besoin répond 503
  `migration_revision_absente` (`MESSAGE_REVISION_ABSENTE`). Jamais d'écriture retentée en
  silence sans la colonne : le plafond choisi ou la pièce jointe disparaîtraient. Un message
  simple ne NOMME pas les colonnes de la révision (il s'écrit avant la migration).
- **Joindre un fichier ou citer un document** (`messages/envoyer`, JSON ou multipart) : la
  migration est SONDÉE avant d'écrire au coffre (aucun fichier orphelin) ; le document cité doit
  appartenir à l'édition ; la pièce passe par le serveur (4 Mo, type lu à l'EXTENSION,
  `clePieceJointe`). Un fichier seul prend « Fichier joint : nom » (le texte reste obligatoire).
- **Le fil de « Parler à l'atelier »** réunit messages, demandes (un message du client qui
  commence par un motif connu devient une carte, `lireMessageDemande`) et propositions
  complémentaires (documents `proposition`), jour par jour (`filDeConversation`). « Vos demandes »
  se lit dans le fil. Aucun rendez-vous inventé : un seul lien, celui de la fiche.
- **Les contenus** (`contenus.ts`, `/api/collectif/contenus`) : un fichier par le serveur (4 Mo)
  ou le questionnaire du mot du dirigeant (`QUESTIONS_MOT`, quatre questions NEUTRES à relire par
  Mathias, PRD §12.14). Envoyer de nouveau ajoute une ligne : le plus récent gagne.
- **Le QR code** (`qr.ts`, `qrcode-generator` épinglé) : modules foncés sur fond clair dans les
  deux modes, une marge de quatre modules.
- **Le brief pièce par pièce** (D24, remplace la page « partie par partie » archivée) : le mur
  montre « Tout, en vrac » et « Votre composition » ; `/style/brief?m=&partie=` ouvre le panneau
  d'UNE partie sur le mur. Aimer une couverture passe par `patchCouvertures` (un brief validé
  repasse « à valider »). Le slug `brief` est réservé (`SLUGS_RESERVES`) : le segment fixe gagne
  sur `style/[slug]`. Migration `20261017_collectif_composition.sql` : sans elle, lecture repliée
  sur `style_id`, « prendre tout le style » s'écrit dans les colonnes d'avant, une pièce répond
  503 `migration_composition_absente`.
- **Le BAT plein écran** : la page suit la scène par unités de conteneur (`container-type: size`,
  `100cqh`, `50cqw`), jamais un plafond en pixels ; la page seule garde son côté de la pliure ;
  notes dans un panneau repliable (feuille du bas sur téléphone, fermée par défaut).

## Les rendez-vous dans l'espace (D23, T-148)

- **Règles de Mathias** (`creneaux.ts`, `REGLES_RDV`) : lundi-vendredi, 10 h à 18 h (Paris),
  30 minutes, réservable jusqu'à la demi-heure qui arrive, aussi loin qu'il y a de la place
  (navigation bornée à `SEMAINES_MAX` semaines). Ne pas inventer d'autre règle (délai minimum,
  pauses) : elles attendent Mathias. Un créneau demandé n'est JAMAIS cru : `lireCreneau` le
  refait depuis les règles.
- **Vie privée** (`agenda.ts`) : on lit l'agenda de l'interlocuteur UNIQUEMENT par « free/busy »
  (des plages occupées, ni titre ni invité). Aucune fonction ne lit un événement ; on n'écrit et
  ne retire que ceux qu'on a posés. Le harnais refuse un GET dans ce module.
- **La connexion** : un compte de service Google (`GOOGLE_AGENDA_COMPTE`, le JSON ou son base64,
  posé par Mathias, jamais collé dans une conversation) avec lequel chacun PARTAGE son agenda
  (« Apporter des modifications aux événements »). Un compte de service n'invite pas le client
  hors Workspace : l'événement va dans l'agenda de l'interlocuteur, le client reçoit notre mail
  avec l'invitation `.ics` (même UID, `SEQUENCE` + 1 à chaque changement).
- **L'ordre d'un geste** (`rendezvous.ts`) : règle → agenda → VERROU en base (index unique
  `interlocuteur_cle, debut` sur les rendez-vous pris) → événement Google ; un événement raté
  défait la ligne. Jamais un rendez-vous affiché qui n'est pas dans l'agenda de l'atelier.
- **Les mails** de rendez-vous ne partent que si `COLLECTIF_MAILS_RDV` est ouvert (valeur
  incomprise = fermé) et que `ATELIER_MAILS_COUPES` ne coupe pas tout ; verrou
  `collectif_mails` posé avant Brevo, retiré si Brevo refuse. Le texte vit dans `mailsRdv.ts`
  (expéditeur `contact@bellajour.com`, le seul vérifié chez Brevo).
- **Repli** : sans la migration `20261015`, sans interlocuteur, sans agenda relié ou sans le
  compte Google, l'espace garde le lien de rendez-vous de la fiche (`rdv_url`). Supprimer un
  événement directement dans Google Agenda ne prévient pas l'espace : annuler depuis la fiche.

## Les retours de Mathias du 14/10 (T-151)

- **« Qui a déposé » et les liens sont UN endroit** : depuis T-152, l'arbre de `dossiers.ts`
  (`sources.ts` est archivé dans `archive/sources-photos-2026-10/`). La page Photos ET le tableau
  de bord le lisent. Les clés des liens (`?p=`) ne sortent que pour qui peut en créer
  (`regler_plafond_participant`) : l'équipe voit les comptes, jamais un lien.
- **Le message de partage** (`partage.ts`, pur) salue le groupe, nomme l'organisation et
  l'événement, dit le plafond et la clôture ; le lien général salue « à tous » et vouvoie.
  Le client le retouche avant WhatsApp, Mail ou copie.
- **La fenêtre d'envoi vit dans la coquille** (`DepotContexte` : `HoteFenetreEnvoi`, la pastille
  dans `EnTeteEcran`). Un lot garde la provenance choisie À L'AJOUT (`moteur.ts`) : un second
  lot ajouté pendant l'envoi ne relabellise jamais le premier. Un fichier choisi deux fois est
  compté (`dejaAjoutes`), jamais sauté en silence.
- **La présélection est un BORD tracé en dedans** (`outline-offset` négatif) : la tuile a une
  containment de peinture (`content-visibility`), un contour extérieur y est rogné.
- **Un contenu a plusieurs fichiers** (`envoisCourants`) ; « Remplacer » range l'ancien comme
  ANCIENNE VERSION (`remplace_le`), gardée au coffre et à l'atelier ; le questionnaire n'a qu'une
  version courante. **Renommer un dossier** (`/api/collectif/dossiers`) change le nom du lien ou
  le `deposant` des photos du responsable ; « Mes photos » rend son propre nom.
- **Citer un de ses envois** dans un message (`collectif_messages.contenu_id`) : l'envoi doit être
  de l'édition ; la lecture du fil se replie en trois paliers (envois, révision, avant).
- **La migration `20261016_collectif_envois.sql`** (appliquée le 14/10) : lecture repliée (tous les fichiers sont
  courants), « Remplacer » et « Citer » en 503 `migration_envois_absente`, SONDÉS avant d'écrire
  au coffre.
- ⚠️ **Ne pas compter sur `router.refresh()` pour montrer ce qu'on vient d'écrire** : vu le 14/10,
  la relecture part (200) mais l'écran ne la prend pas toujours. La route rend l'objet écrit et
  l'écran l'affiche aussitôt (contenus, nom d'un dossier) ; la relecture confirme ensuite.

## Les retours du 14/10 au soir (T-152)

- **Un dossier de photos n'a PAS de table** (`dossiers.ts`, pur) : c'est le NOM sous lequel le
  responsable a déposé (`collectif_photos.deposant`, `provenance_type` « organisateur »). Un
  sous-dossier s'écrit « Parent / Enfant » (`SEPARATEUR`, UN seul niveau, décision de Mathias) ;
  « Mes photos » est son propre nom (`estPropre`). Ranger (`planDeplacement`) ou renommer
  (`nouveauChemin`) RÉÉCRIT ce nom, par paquets d'ids de l'édition ; rien ne s'efface, le journal
  garde l'ancien chemin. Un « / » tapé dans un nom devient « - » (`lireNomDossier`). Les photos
  d'avant déposées sous un TYPE (photographe, autre) gardent leur nom, sans préfixe de type.
- **La page Photos n'a PLUS de grande colonne** (15/10, retour de Mathias : avec beaucoup de liens
  elle devenait longue, archive `photos-colonne-2026-10/`) : des RAYONS au-dessus des photos
  (`rayonDe`), et deux VUES D'ENSEMBLE (`vous`, `liens`, `estVueEnsemble`) qui montrent des
  vignettes de dossiers ou de liens, sans grille ni vignette de photo signée ; la route ne signe
  qu'une couverture par dossier ou lien. Un lien montre ses personnes en pastilles (dès deux).
- **Une clé de dossier dit où regarder** : `tout`, `selection`, `vous`, `liens`,
  `resp:<type>:<nom>`, `lien:<id>`, `participants`, `pers:<id|general>:<nom>`, `atelier`. La grille, le compte, « Tout
  sélectionner ce dossier » et le tableau de bord lisent TOUS `dansLeDossier` : une seule règle.
- **Les liens vivent dans l'onglet « Les liens »** ; l'équipe n'en voit aucun (`partage`).
  Supprimer un lien = `retire_le` (jamais un DELETE) : sa page de dépôt devient introuvable, la
  route refuse, ses photos restent. Changer son nombre de photos = la règle de la création
  (`lirePlafondLien`), plafonnée par ce qu'il reste à l'édition.
- **La visionneuse** (`_composants/Visionneuse.tsx`, `visionneuse.ts`) : un document s'ouvre dans
  la page par un PORTAIL dans `.ec-contenu` (ouverte depuis une bulle, elle serait sinon de la
  taille de la bulle). Deux adresses signées : `voir` sans en-tête (elle s'affiche), `url` ou
  `telecharger` avec le nom propre (elle télécharge). PDF et images se peignent, le reste se
  télécharge.
- **Répondre** (`reponse_a`) : le message répondu doit être de la MÊME édition (`lireReponseA`,
  qui sonde la migration AVANT le coffre) ; la lecture du fil se replie en quatre paliers
  (réponses, envois, révision, avant). L'atelier écrit par `ConversationAtelier`, partagée par
  la fiche et la boîte de réception.
- **La boîte de réception de l'atelier** (`boite.ts`, pur) LIT seulement : l'aperçu d'une
  conversation ne marque rien ; seule l'ouverture le fait (l'effet de `useMessagerie`). Les
  non-lus se COMPTENT (`compterNonLus`, `head: true`), jamais en marquant.

## Les mails des éditions (T-146, 15/10)

- **Un seul circuit** : `mails.ts` → `envoyerMailCollectif` (coupé par défaut par
  `COLLECTIF_MAILS`, verrou `collectif_mails` AVANT Brevo et RETIRÉ si Brevo refuse ou si le
  réseau tombe, journal `mail_envoye` / `mail_echec` avec l'adresse masquée). Tout nouveau mail
  des éditions passe par lui ; son texte vit dans `mailsTextes.ts` (pur, harnais, aperçu dans
  l'atelier), jamais dans un modèle Brevo. Les mails de rendez-vous gardent leur chemin
  (`envoyerMailRdv`, `COLLECTIF_MAILS_RDV`).
- « Votre espace est prêt » part depuis la fiche (« Réglages et liens »), en deux temps ; le
  verrou porte l'empreinte du lien du responsable : régénérer le lien permet de le renvoyer.
- ⚠️ Un lien vers l'espace du responsable porte son token : il ne part qu'à SON adresse.

## Le lien du responsable : modifier demande un appareil reconnu (T-154, 15/10)

- **Décision de Mathias, revue le même jour** : pas un écran qui bloque (« si elle va sur un autre
  appareil, c'est un peu chiant »), mais « que l'accès soit un peu compliqué pour pas que les gens
  se permettent de tout le temps modifier ». Donc : sur un appareil pas encore reconnu, le lien du
  responsable s'ouvre EN LECTURE (`chargerAcces` rend `role: "equipe"`, `appareilInconnu: true`) ;
  le responsable reste lui-même à l'écran (nom, « Bonjour »), le menu dit « en lecture ici », et
  une pastille en tête de chaque écran (`PastilleAppareil`) propose « Recevoir un code pour
  modifier » : un code par mail, saisi dans une fenêtre, et l'appareil est reconnu un an. Le lien
  de l'équipe et celui des participants ne changent pas ; l'atelier connecté passe toujours.
- **Coupé par défaut, et doublement** : `controleAppareilActif` exige `COLLECTIF_CODE_APPAREIL` ET
  `COLLECTIF_MAILS`. ⚠️ Sans mail, personne ne recevrait son code : ne jamais ouvrir le premier
  sans le second. Sans la migration `20261019_collectif_appareils.sql` (appliquée le 15/10), on
  laisse passer et le serveur le note.
- **Rien en clair** : le cookie `bj_ec_appareil` (httpOnly, un an) porte un identifiant aléatoire,
  la base n'en garde que l'empreinte ; un code n'existe en clair que dans le mail, la base garde
  son empreinte LIÉE à l'appareil qui l'a demandé. Régénérer le lien du responsable rend tous ses
  appareils inconnus (`lien_empreinte`).
- Réglages SOUPLES, choisis le 16/10 sur délégation de Mathias (« il faut pas que ça soit très
  compliqué pour les gens ») : 24 heures par code, 10 essais, 10 codes par heure et par édition,
  appareil reconnu un an (`appareil.ts`). `COLLECTIF_CODE_ESSAI` fixe le code pour une recette LOCALE :
  il ne vaut que pour une demande venue de localhost (le `.env.local` tiré de Vercel contient
  `VERCEL`). Une seule route lit l'accès sans le contrôle : `/api/collectif/appareil`.

## « Retrouver mon espace » (T-154, 16/10)

- `/edition/retrouver`, joignable par l'adresse courte `/espace` (`next.config.ts`, 307) : le
  responsable tape son adresse, son lien part par mail À CETTE ADRESSE. ⚠️ **La réponse est la
  même que l'adresse soit connue ou non** (patron `/api/waitlist`) : même corps, même statut, et
  les mails partent APRÈS la réponse (`after`) derrière `delaiNeutre`. Sinon la page serait un
  annuaire des clients.
- C'est la SEULE route publique sans token (le harnais la nomme : `SANS_TOKEN`) : ni
  `chargerAcces` ni `peut`, elle ne lit qu'une adresse (enregistrée en minuscules par
  `saisie.ts`) et n'écrit qu'un verrou de mail. Frein : un mail au plus par quart d'heure et par
  édition (`RETROUVER-<quart d'heure>`). Une édition archivée ne reçoit rien.
- La page et la route ne regardent QUE `COLLECTIF_MAILS` (`mailsCollectifEnService`) : fermé, la
  page dit « ce service ouvre bientôt » et donne contact@bellajour.com ; en local,
  `ATELIER_MAILS_COUPES` coupe l'envoi lui-même et le serveur note à qui il serait parti.
- La page « lien introuvable » (`edition/not-found.tsx`, la même pour tout lien inconnu) y renvoie ;
  le mail « Votre espace est prêt » cite l'adresse courte.

## Phase 7 : les accroches déjà posées

`collectif_mails` (verrou unique `edition_id` + `code`, même mécanique que `mails_envoyes` :
insérer AVANT Brevo, retirer si Brevo refuse, et ne pas reproduire le défaut du B2C dont le
`catch` externe ne retire pas le verrou), `collectif_evenements` (journal, `style_id` pour
l'éditeur de styles), `demo`, `photos_supprimees_le`. Aucun mail ne part avant la phase 7, et
jamais sans l'accord de Mathias. Le webhook Brevo ne connaît que `numeros` : un rebond B2B y est
aujourd'hui ignoré.

## Vérifier

`npx tsx --tsconfig tsconfig.json scripts/verif-collectif.ts` — sans base ni réseau. Toute règle
ajoutée ici s'y ajoute aussi. `scripts/verif-atelier.ts` doit rester vert à chaque livraison.
