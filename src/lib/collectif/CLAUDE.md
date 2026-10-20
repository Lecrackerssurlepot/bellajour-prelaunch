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
  participant a les deux, tenu PAR APPAREIL (un frein, pas une garantie). **Un plafond PAR
  PERSONNE `null` FERME le dépôt du participant** (`plafond_non_regle`) : on ne devine pas, et
  `/depot` le dit AVANT le choix des photos (`depotRegle`). **Exception D27 (20/10) : un TOTAL
  vide = pas de limite pour toute l'édition** (« on ne sait pas forcément combien il y aura »).
  Les phrases de refus suivent le registre (`messagePlafond`). Le plafond atelier qui descend
  ramène le curseur du client dans la même écriture (sinon la contrainte de la base refuse).
- **`cles.ts`** — tout sous `collectif/`, jamais `numeros/`. Chaque fabrique refuse un id qui
  n'est pas un uuid. Les pages d'un tour sont rangées par l'**id** du tour, pas son numéro (deux
  magazines ont chacun leur tour 1 : écart corrigé du PRD §6.1).
- **`types.ts`** — le miroir des treize tables et le vocabulaire. `TYPES_NOTE` est une liste
  EXTENSIBLE : texte libre en base, une ligne ici pour un nouveau type.
- **`demandes.ts`** — ce que l'atelier demande au client (T-191), voir plus bas.
- **`interrupteur.ts`**, **`migration.ts`** — voir plus bas.

**Phase 1 (13/10/2026), les purs de l'atelier :**
- **`dates.ts`** — l'heure de PARIS, explicitement : `instantDeParis` (le champ `datetime-local`
  → instant ISO, `null` pour l'heure qui n'existe pas au passage à l'heure d'été),
  `versChampParis`, `formaterInstantParis`. Jamais `new Date(champ)` : il lit l'heure de la
  machine, et ni celle de Vercel (UTC) ni celle de l'atelier ne sont forcément Paris.
- **`saisie.ts`** — la règle de création ET de réglage d'une édition (exigés : organisation,
  événement, registre, e-mail du responsable, un magazine ; une clôture passée refusée, voir
  T-186 plus bas ; tout chiffre vide reste `null` ;
  `rdv_url` en https seulement ; `suggestionEmail` suggère, ne bloque pas ; la case
  « démonstration » ne s'écrit jamais d'ici). `planMagazines` : renommer toujours, ajouter à la
  suite, retirer n'importe quel magazine ENCORE VIDE, les suivants prenant le numéro libéré
  (T-190, renumérotation validée par Mathias le 19/10 au soir ; voir plus bas).
- **`styles.ts`** — la forme d'un style (palettes de 4 couleurs, deux typos + un échantillon en
  IMAGE, couvertures, TOUJOURS cinq doubles pages types), sa saisie (le slug ne change jamais,
  une image d'un autre style est refusée), `manquesPourPublier` (le serveur refuse de publier
  un style incomplet), `nomImageStyle` (nom versionné, jamais d'écrasement).
- **`prochaine.ts`** — la prochaine étape et son camp, lue par la liste ET la fiche.
- **`recit.ts`** — le journal en français ; **jamais un token** (un lien régénéré se dit par son
  rôle, pas par sa valeur). **`liens.ts`** — les trois liens, et DEUX origines (T-164) :
  `origineDepuis` (la requête, localhost en local) pour un lien AFFICHÉ ; `origineDesMails`
  (`NEXT_PUBLIC_SITE_URL`, sinon `https://www.bellajour.fr`) pour un lien qui part PAR MAIL.

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
  `contenusAEnvoyer`. **`messages.ts`** (pur) — la relève à PALIERS (T-169, 20/10) : 3,5 s après
  un mouvement, puis 10 s, 30 s, 60 s au repos, retour immédiat à la frappe et au retour sur
  l'onglet, rien onglet caché ; `fusionnerMessages` sans doublon.
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
  morte depuis 2 h ne bloque plus personne). **`doublons.ts`** — empreinte exacte d'abord (coût
  linéaire), quasi-doublons bornés (au-delà, `complet: false`, aucun groupe inventé), mêmes
  groupes que `groupesDeDoublons` (T-170, 20/10 ; l'ancien découpage en tronçons est dans
  `archive/doublons-troncons-2026-10/`). Les groupes se RANGENT dans `collectif_doublons` quand
  les empreintes sont lues (`doublonsStockes.ts`) ; l'affichage les LIT, il ne les recalcule que
  périmés (signature changée) ou sans la migration 20261022.
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
- Le mur et la page d'un style lisent `chargerMur` (styles PUBLIÉS et visibles ; les tailles
  600 et 1 200 px d'une pièce (T-172, `taillesStyle.ts`) en `srcset`, signées à adresse stable
  par `signerLectureVignette` ; sans tailles, l'image maîtresse). Un style dépublié disparaît du mur ; un brief qui le nomme reste lisible côté
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
  Mathias, PRD §12.14). Envoyer de nouveau ajoute une ligne : le plus récent gagne. Depuis T-191,
  ce sont des DEMANDES nommées par l'atelier : voir « Les demandes sur mesure » plus bas.
- **Le QR code** (`qr.ts`, `qrcode-generator` épinglé) : modules foncés sur fond clair dans les
  deux modes, une marge de quatre modules.
- **Le brief pièce par pièce** (D24, remplace la page « partie par partie » archivée) : le mur
  prend TOUTE la largeur (T-179, 19/10 : plus de colonne à droite, archive
  `composition-colonne-2026-10/`) ; une barre « Votre composition » en bas montre les choix en
  IMAGES et ce qui manque, « Voir ma composition » ouvre une feuille (portail dans `.ec-contenu`)
  où l'on valide le brief. Chaque geste passe par `jouer()` (`Mur.tsx`) : il s'annonce
  (`role="status"`) et « Annuler » rejoue l'inverse (`gesteInverse`, `pieces.ts`, prouvé au
  harnais) par le même envoi ; aucune règle de `brief.ts` n'est réécrite à l'écran ; `/style/brief?m=&partie=` ouvre le panneau
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
  qu'une couverture par dossier ou lien. Un lien montre ses personnes en pastilles DÈS LA PREMIÈRE
  (T-180 : seul sur son lien, un participant ne voyait son nom nulle part).
- **Une clé de dossier dit où regarder** : `tout`, `selection`, `vous`, `liens`,
  `resp:<type>:<nom>`, `lien:<id>`, `participants`, `pers:<id|general>:<nom>`, `qui:<nom>`, `qui:@responsable`,
  `atelier`. La grille, le compte, « Tout
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

## Qui a envoyé, et les photos qui arrivent (T-180, T-181, 19/10)

- **Une personne, c'est un NOM comparé sans la casse ni les espaces** (`clePersonne`,
  `personnesDe`, `compterPersonnes` dans `dossiers.ts`) : « Mathias » et « mathias » sont une
  seule personne, montrée sous l'orthographe la plus fréquente ; « Sans nom » compte un
  téléphone par anonyme. Les pastilles, « N personnes » (page Photos ET tableau de bord) et le
  filtre lisent cette règle-là, et non plus le nombre d'appareils. Chaque vignette porte le nom de qui
  l'a envoyée (`qui` dans la réponse de `/api/collectif/photos`) ; « Toutes les photos » a sa
  rangée de personnes, tous liens confondus (`qui:<clé>`, le responsable en `qui:@responsable`).
- Le participant retrouve son prénom sur son téléphone (`localStorage`, lu par
  `useSyncExternalStore`), et il part avec les photos même s'il ne l'a pas retapé.
- **Voir arriver sans recharger** : `/api/collectif/photos/etat` est une lecture LÉGÈRE (un
  compte en `head`, et les lignes arrivées depuis la dernière vue, `ARRIVEES_LUES_MAX`). La page
  Photos l'interroge toutes les 30 s, le tableau de bord chaque minute, jamais onglet caché
  (`useSondage`, `arrivees.ts`). ⚠️ Ne jamais sonder `/api/collectif/photos` (une page, ses
  doublons, 120 signatures) : il ne se relit qu'au clic sur « Les voir ». ⚠️ `depuis`
  voyage TEL QUE la base l'a rendu : relu par `Date`, il perd ses microsecondes et la dernière
  photo vue se recompterait. Les envois du responsable ne s'annoncent pas.
- « Toutes » montre la DERNIÈRE arrivée d'abord (ce qui arrive est en haut) ; « Par jour » garde
  l'ordre des jours de prise de vue.

## Plus de 1 000 photos (T-167, T-168, 19/10)

- ⚠️ **Supabase plafonne CHAQUE réponse à 1 000 lignes** (« Max rows », confirmé par Mathias le
  19/10) et `.limit(20000)` ne peut que réduire : une lecture d'un coup s'arrête à 1 000, SANS
  erreur. Toute lecture de lignes qui peut dépasser 1 000 passe par **`lireToutesLesLignes`**
  (`lignes.ts`) : tranches de 1 000, triées par une colonne PUIS par `id` (un lot de 25 photos
  partage le même `confirmee_le`), une tranche en erreur = toute la lecture en erreur (son code
  gardé pour les replis), `MAX_TRANCHES` refuse au lieu de tronquer. Là où seul le nombre sert :
  un compte `head` (`compterPourPlafond`, deux comptes en parallèle, filtre `filtreDansPlafond`
  = `compteDansPlafond` mot pour mot, prouvé au harnais).
- **Un filtre `.in()` voyage dans l'URL** : par paquets de `PAQUET_IN` (100) avec `enPaquets`.
  500 uuid font 19,5 Ko d'URL, 500 clés de fichier jusqu'à 40 Ko (d'où `LOT_VERIFICATION` = 100).
- **Le lot de l'atelier compte avant de lire** : moins de lignes lues que de photos comptées =
  500 `lot_incomplet` avec les deux nombres, affiché par la fiche ; jamais « N photos écrites »
  sur un lot qui en a perdu.
- **La confirmation est idempotente** (`depot/complete`) : une photo déjà confirmée est rendue
  telle quelle (ni redatée, ni rejournalisée, ni relue) ; l'`update` porte `.is("confirmee_le", null)`.
- **Le journal de la fiche** ne lit pas `JOURNAL_DE_LOT` (`photos_confirmees`,
  `metadonnees_lues`, une ligne par lot) : elles chassaient tout le reste des 100 dernières.

## Terminer la collecte, la sélection vue par l'atelier (T-182, D25, 19/10)

- **Le RESPONSABLE peut terminer la collecte** (`terminer_collecte`, droit et geste du même nom,
  route `/api/collectif/collecte/terminer`) : même effet que « Clore maintenant » de l'atelier
  (la clôture devient maintenant, les liens des participants se ferment). Deux temps
  (`verifier: true` compte, le second appel écrit), écriture conditionnée à l'état lu (409 si
  l'atelier a déjà clos). L'atelier l'apprend par un MESSAGE du client dans sa boîte
  (`messageFinCollecte`, `espace.ts`) et par le journal ; AUCUN mail. Rouvrir reste à l'atelier.
- **L'atelier voit la sélection** (« Ma sélection » du client) : nombre et huit vignettes dans
  l'onglet Photos de la fiche, « Télécharger la sélection » (le lot avec `selection: true`, écrit
  dans le dossier « Sélection du client »), et « Collecte terminée par … » lu au journal.

## La messagerie de l'atelier : ce qui est nouveau (T-188, 19/10)

- **« Messages » compte des CONVERSATIONS** (éditions non archivées avec au moins un message du
  client non lu), pas des messages : `compterConversationsEnAttente` (`admin/collectif/donnees.ts`,
  exact au-delà de 1000 lignes), la route GET `/api/admin/collectif/en-attente`, relue chaque
  minute onglet visible (`VeilleMessages`, patron `Rafraichissement.tsx`), et l'onglet du
  navigateur « (3) Atelier · … ». La barre des particuliers lit le même compte.
- **Le trait « N nouveaux messages »** se calcule au rendu SERVEUR, AVANT tout marquage
  (`nonLusAtelier` de la fiche, `premierNouveau` de `nouveaux.ts`, pur), puis reste en état local.
- **Le marquage est BORNÉ** à ce que l'écran affiche (`marquerLus(…, jusqua)`, le PATCH reçoit
  `{ jusqua }` tel que la base l'a rendu) ; une borne illisible est refusée (422), jamais lue
  comme « tout marquer ». La boîte n'ouvre plus rien d'office : sans `?e=`, rien n'est marqué.
  « Marquer comme non lu » (`{ nonLu: true }`) rend non lu le dernier message du client.
  L'espace client garde son marquage sans borne.

## Les demandes sur mesure (T-191, planche 12 du 19/10 au soir)

- **L'atelier compose ses DEMANDES** (`demandes.ts`, pur) : un NOM qu'il écrit (le client le lit
  tel quel, puce et titre de fenêtre), une FORME (`images`, `pdf` = PDF ou SVG, `tout`, ou
  `questionnaire` = les quatre questions de `QUESTIONS_MOT`), une CLÉ. L'écran est
  `admin/collectif/DemandesClient.tsx` (l'étape 5 du formulaire, son propre composant) ; la fiche
  les montre dans `[id]/PanneauContenus.tsx` avec ce qui est reçu.
- ⚠️ **`contenus_demandes` (jsonb) a DEUX formes, une seule lecture** : les clés texte d'avant
  (`"logo"`…) se lisent comme des demandes HÉRITÉES (`lireDemandes`), avec le nom, les formats et
  les phrases de `CONTENUS_CLIENT`, et repartent en clé texte tant qu'on n'y touche pas : une
  édition existante ne change pas d'un pixel. Une liste qui n'a que
  des clés texte se lit dans l'ordre d'aujourd'hui. Le formulaire lit par `demandesDuFormulaire`
  (une demande sans nom y reste, le nom n'est pas nettoyé pendant la frappe) ; jamais l'inverse.
- **La clé** : héritée, c'est le type d'origine ; renommer une héritée GARDE sa clé (ses envois
  restent les siens, et elle marche avant la migration). Nouvelle, elle est tirée au sort
  (`nouvelleCle`, « d-… ») et ne sert qu'une fois. Une édition neuve part de
  `DEMANDES_PAR_DEFAUT` (les clés d'origine, sous les noms de la planche).
- **La règle de saisie** (`lireDemandesSaisies`, appelée par `lireSaisieEdition`) : nom non vide,
  80 caractères, forme connue, 12 au plus, clés ET noms uniques, « Le mot de » à compléter.
- **La forme d'un fichier** (`lireFichierDemande`) : l'extension ET le type annoncé par le
  navigateur (un type vide ou générique laisse décider l'extension) ; le navigateur la relit AVANT
  d'envoyer et dit pourquoi (« Seulement une image », « Seulement un PDF ou un SVG »). Le type
  écrit au coffre vient de l'extension, par `Object.hasOwn` ; inconnue, `application/octet-stream`
  (jamais `text/html`). Une héritée garde la règle d'avant, message compris.
- **Vous / tu** (`vueDemande`) : aides et questions suivent le registre (`QUESTIONS_MOT_TU`, la
  transposition à relire avec `QUESTIONS_MOT`) ; les RÉPONSES se rangent toujours sous la question
  au vouvoiement. Une héritée garde son texte d'avant, au vouvoiement comme avant.
- **Les envois portent le nom de leur demande** (`nomDeLEnvoi`, `modeDeLEnvoi`) : tableau de bord,
  « Parler à l'atelier », envoi cité, fiche, journal (`payload.type` = le nom lu, `payload.cle`).
  Une demande retirée disparaît chez le client ; ses envois restent à l'atelier (« Demande retirée »).
- **La migration `20261021_collectif_demandes.sql`** ne fait que relâcher la contrainte de
  `collectif_contenus.type`. Sans elle : les cinq clés d'origine (renommées ou non) marchent ; une
  demande NOUVELLE se crée et se voit, mais un envoi y est refusé (23514) : la route le SONDE
  avant le coffre (`migrationDemandes`, `sondeDemandes.ts`) et répond 503
  `migration_demandes_absente` ; si la base refuse quand même, le fichier écrit est retiré. ⚠️ Une
  contrainte ne se lit pas par PostgREST : la sonde tente une insertion vouée à l'échec (une
  édition qui n'existe pas). Contrainte présente : 23514 avant toute écriture ; relâchée : la clé
  étrangère refuse (23503) et l'instruction est annulée. Aucune ligne ne survit. L'étape 5 la
  demande une fois par chargement (`GET /api/admin/collectif/demandes`) et le DIT quand une
  demande nouvelle existe.

## Les mails des éditions (T-146, 15/10)

- **Un seul circuit** : `mails.ts` → `envoyerMailCollectif` (coupé par défaut par
  `COLLECTIF_MAILS`, verrou `collectif_mails` AVANT Brevo et RETIRÉ si Brevo refuse ou si le
  réseau tombe, journal `mail_envoye` / `mail_echec` avec l'adresse masquée). Tout nouveau mail
  des éditions passe par lui ; son texte vit dans `mailsTextes.ts` (pur, harnais, aperçu dans
  l'atelier), jamais dans un modèle Brevo. Les mails de rendez-vous gardent leur chemin
  (`envoyerMailRdv`, `COLLECTIF_MAILS_RDV`).
- « Votre espace est prêt » part depuis la fiche (« Réglages et liens ») ou l'écran « L'édition
  est créée » (T-187), en deux temps ; le verrou porte l'empreinte du lien du responsable :
  régénérer le lien permet de le renvoyer.
- ⚠️ Un lien vers l'espace du responsable porte son token : il ne part qu'à SON adresse.
- ⚠️ **Un lien qui part par mail prend `origineDesMails(process.env)`**, jamais `origineDepuis`
  ni un en-tête de la requête (T-164) : `x-forwarded-host` s'écrit par l'appelant, et
  « Retrouver mon espace » enverrait sinon un vrai mail de Bellajour qui mène le token du
  responsable chez un tiers. L'aperçu du mail suit la même règle (on relit ce qui partira). Le
  harnais refuse `origineDepuis` et `x-forwarded-host` dans toute route d'API ; les pages
  qui AFFICHENT des liens gardent `origineDepuis`.

## Créer une édition, et l'écran des liens (T-186, T-187, planches 5 et 6 du 19/10)

- **Six étapes, une seule liste** (`ETAPES_EDITION`, saisie.ts) pour la création ET l'onglet
  « Réglages et liens » : le client, le calendrier, les magazines, les photos, à envoyer par le
  client, le devis. `ETAPE_DU_CHAMP` range chaque champ : une erreur (relue AVANT l'envoi par
  `lireSaisieEdition` dans le navigateur, ou rendue par la route) ramène à son étape et la nomme.
  Un champ ajouté à la saisie s'ajoute à `ETAPE_DU_CHAMP` (le harnais le vérifie). En réglages,
  le formulaire n'est JAMAIS dans une carte (rail et corps côte à côte, ou le rail en deux rangs
  au-dessus quand la colonne des liens est à droite).
- ⚠️ **Le bouton « étape suivante » et « Créer l'édition » portent chacun leur `key`.** Sans elles,
  React garde le même `<button>` et le passe en `submit` PENDANT le clic sur « Le devis → » : le
  navigateur envoie le formulaire et l'édition se crée sans passer par la dernière étape (vu à la
  recette du 19/10).
- **La clôture** (`calendrier.ts`, pur) : raccourcis « Dans 2 semaines / 3 semaines / 1 mois »
  (un mois après le 31 janvier = le dernier jour de février), ou le calendrier ; 23 h 59 heure de
  Paris par défaut ; le jour choisi se range parmi les raccourcis. Le jour d'AUJOURD'HUI vient du
  serveur (prop `maintenant`), jamais de l'heure de l'ordinateur. **Une clôture passée est
  refusée par `saisie.ts`** : à la création toujours, en réglage SEULEMENT si elle change
  (comparée à la minute à `actuel.cloture_le`, que le PATCH lit). Inchangée, elle n'est ni
  refusée ni réécrite, et l'écran ne la renvoie même pas : une édition close reste réglable.
  ⚠️ Pré-existant, non touché : déplacer la clôture d'une édition close PAR LE TEMPS (état stocké
  `preparation`) vers le futur, ou la vider, la rouvre de fait, sans passer par le geste
  `rouvrir_collecte` et sa règle (aucun tour publié).
- **La livraison souhaitée** ne s'écrit qu'à la CRÉATION (`livraison_prevue_le` → `livraison:
  { prevue_le }`, insertion : rien à écraser). En réglage, saisie.ts ne produit jamais `livraison`
  (l'onglet Livraison la FUSIONNE) : la frise la montre et renvoie à l'onglet.
- **« L'édition est créée »** vit à `/admin/collectif/creee/[id]`, PAS sous `[id]/` : sous la
  fiche, `[id]/loading.tsx` (la silhouette de la fiche) s'afficherait d'abord. Les adresses s'y
  montrent ABRÉGÉES (`lienAbrege`, quatre caractères du token) ; le lien entier ne sort que par
  « Copier ». L'envoi passe par `useEnvoiEspace` (le même flux en deux temps que l'onglet
  Réglages) ; l'état des mails est lu par le SERVEUR (`mailsCollectifOuverts`) : fermés, le
  bouton dit « Mails coupés : copiez les liens » et ne fait rien, « Copier les trois liens »
  (`texteTroisLiens`) devient le geste principal. L'aperçu est l'iframe du GET `mail-espace`.
- **Le mail « Votre espace est prêt » porte les TROIS liens** (texte de la planche 6 validé par
  Mathias le 19/10) : `donneesEspacePret` est la seule façon de l'assembler (route ET écran). Le
  sien en bouton, l'équipe et les participants en ADRESSE écrite et cliquable (un mail ne
  copie pas). Le journal ne voit que l'empreinte du lien du responsable et l'adresse masquée.
  `COLLECTIF_MAILS` reste fermé : l'ouvrir attend Mathias.
- **« Partager avec mon équipe »** (`PartageEquipe.tsx`, en bas du menu de la coquille) : le
  layout de l'espace ne calcule le lien d'équipe que si `voitLienEquipe` (le responsable, y
  compris sur un appareil pas encore reconnu) ; l'équipe ne le reçoit jamais dans sa page.

## Le calendrier, les magazines, les chiffres (T-189, T-190, planches 9 à 11 du 19/10 au soir)

- **Aucun champ du navigateur pour une date ou un chiffre** dans le formulaire d'une édition (le
  harnais refuse `type="date|datetime-local|time|number"`). Le calendrier est `Calendrier.tsx`
  (admin/collectif), en PLAGE pour les dates de l'événement, en JOUR pour la clôture et la
  livraison ; la logique est pure dans `calendrier.ts` (`grilleMois`, `cliquerPlage`,
  `textePlage`, `lirePlage`, `jourAuClavier`…). Il manie des JOURS, jamais une heure : 23 h 59
  Paris, l'instant et le refus du passé restent à `champCloture`, `instantDeParis`, `saisie.ts`.
  Aujourd'hui vient du SERVEUR (prop `maintenant`), jamais de l'ordinateur.
- **`dates_texte` reste un texte** : le calendrier l'écrit (« du 2 au 4 octobre 2026 ») et
  `lirePlage` le relit ; un texte qu'il ne relit pas reste tel quel, éditable, rien n'est
  sélectionné. `textePlage` et `lirePlage` sont l'aller et le retour l'un de l'autre (harnais) :
  changer l'un, c'est changer l'autre.
- ⚠️ **Un verre dans un verre ne floute pas** (Chrome, vu le 19/10) : posé sous `.eca-form-corps`
  (lui-même en `backdrop-filter`), le panneau laissait lire net le texte qu'il couvre. Tant qu'un
  calendrier est ouvert, le corps pose son flou (`.eca-form-corps:has(.eca-cal)`). Tout nouveau
  panneau de verre posé DANS un verre a le même défaut.
- **Retirer un magazine** : `magazineVide` est LA règle (aucune pièce de brief ni couverture
  aimée ni part de texte, ni brief ni BAT validé, aucun tour ; `collectif_tours` est la seule
  table qui pointe vers un magazine), lue par la fiche (`donnees.ts`) et par le PATCH. Le PATCH
  répond 409 `magazine_commence` sur un commencé. ⚠️ `unique (edition_id, rang)` : retraits
  d'abord, puis les rangs resserrés UN PAR UN du plus petit au plus grand (`resserrerRangs` :
  chacun descend sur une place libre), puis les ajouts. Jamais un `update` groupé des rangs, ni
  l'ordre inverse. La suppression redit les colonnes brutes : un magazine commencé entre la
  lecture et l'écriture reste, la route resserre ce qui est vraiment resté et répond 409
  `partiel`. Chaque retrait se journalise (`magazine_retire`).
- **La route rend la liste des magazines écrite**, l'écran la reprend (`reprendreMagazines`) :
  l'état du formulaire survit à `router.refresh()`, et un magazine ajouté repartait en double au
  second « Enregistrer ».
- **Les chiffres** (`Pastille.tsx`) : texte numérique, vide = `null`, « − » jamais sous le
  minimum, « + » sur un vide part du minimum. `VALEURS_RAPIDES` (saisie.ts) : des raccourcis là
  où la planche en montre, jamais une valeur par défaut.
- **Le message d'accueil** : l'aperçu (`ApercuDepot.tsx`) suit la frappe, sans rien lire en base ;
  `accueilParDefaut` est MOT POUR MOT la phrase de `/depot/[token]` (le harnais compare les deux) :
  changer l'une, c'est changer l'autre.

## L'accord du participant, enregistré avec chaque photo (T-184, 19/10)

- **La case d'accord de `/depot` n'est plus un simple verrou d'écran.** Cocher donne au moteur la
  VERSION du texte (`VERSION_ACCORD`, `accord.ts`, pur) ; chaque photo la garde AU MOMENT du
  choix (comme la provenance) et la déclaration porte `accord: true` + `accordVersion`. La route
  `depot/presign` refuse un PARTICIPANT sans elles (400 `accord_requis`, avant toute écriture),
  puis écrit `accord_version` et `accord_le` (heure du SERVEUR) dans la MÊME insertion que la
  photo. Le responsable et l'atelier ne cochent rien (accord nul). La vérification d'une reprise
  (`connues`) n'écrit rien et ne le demande pas.
- ⚠️ **Le texte est légal et VERSIONNÉ** : il vit dans `Depot.tsx`, ses versions dans
  `TEXTES_ACCORD` (une `Map`, jamais un objet littéral : T-161). Changer un mot = ajouter une
  version et la rendre courante ; le harnais compare le texte affiché à la version courante.
  Une version ne se retire jamais : des photos la portent.
- **Migration `20261020_collectif_accord_participant.sql`** (appliquée par Mathias le 19/10,
  colonnes vérifiées en lecture) : sans elle, le refus tient déjà mais
  l'insertion se replie SANS les deux colonnes et le serveur le note à chaque lot. Ce repli
  d'écriture est voulu (à rebours de la révision) : bloquer tous les participants ne protégerait
  personne. Après l'avoir appliquée, vérifier que la donnée ARRIVE (`supabase/CLAUDE.md`).

## La première vraie édition : l'envoi qui tient, le nom figé, le style en vitrine (T-192, 19/10 au soir)

- **Le moteur et le réseau** (`moteur.ts`, prouvé sur un banc : le vrai moteur compilé, un faux
  serveur aux mêmes règles pures, Chrome headless bridé) : une COUPURE ne brûle aucun essai (on
  attend `online`) ; seul un refus HTTP du coffre compte (3) ; « en ligne mais sans réponse »
  (wifi d'école qui filtre R2) a son compteur (12) et une phrase qui dit de passer en 4G.
  Chaque POST a un garde-temps (30 s, 60 s pour `complete`) ; une réponse 200 illisible est une
  coupure, jamais « rien d'accepté ». 404 ferme avec « Ce lien n'est plus actif », un autre 4xx
  refuse le lot, 5xx = `serveurLent`. ⚠️ Ne pas remettre « tout statut ≠ 200 = hors ligne » :
  un lien supprimé tournait à l'infini.
- **La clôture** (`fermer`) refuse ce qui n'est pas parti, laisse finir ce qui est en route et
  CONFIRME ce qui est au coffre (`confirmerRestes`) : `complete` n'a pas de verrou de clôture.
- **La vignette repart** (4 essais) : sans elle, la grille montrait l'original (T-171).
- **La clé d'une photo** (`cleDepot.ts`, pur) : `sel~nom|taille|date`, où la date vaut 0 si elle
  a moins de 10 min (sur iPhone, c'est l'heure du CHOIX : la même photo re-choisie repartait en
  double) et où le SEL de l'appareil (`bj-depot-sel`, localStorage) empêche deux participants
  d'avoir la même clé (unique par édition : la seconde photo serait « déjà là », perdue).
- **Moins de requêtes** : jusqu'à 40 photos préparées d'avance (8 en mémoire au plus), une
  déclaration attend un lot de 10 quand les voies sont pleines, `place === 0` refuse d'office le
  reste du lot (500 photos à plafond 30 : 53 déclarations au lieu de 480), confirmation groupée
  sur 15 s. Screen Wake Lock pendant l'envoi ; une page qui a dormi n'avorte pas ses PUT.
- **Le nom du participant ne change plus** (`participant.ts` pur, `participantConnu.ts` effets) :
  prénom ET nom la première fois, puis « en tant que … » ; la page lit le cookie
  `bj_depot_appareil` pour retrouver le nom et le nombre de photos arrivées ; la route
  `depot/presign` reprend le nom de l'appareil AVANT celui du navigateur. Un téléphone prêté
  envoie sous le nom de son propriétaire : assumé (« il ne se change plus ensuite »).
- **Le style est FERMÉ** (`COLLECTIF_STYLES`, interrupteur.ts, absent = fermé) : `style`,
  `style/brief`, `style/[slug]` rendent `Vitrine.tsx` (couvertures statiques déjà publiées,
  jamais le mur ni une image signée), `/api/collectif/brief` répond 409 `styles_fermes`, le
  tableau de bord dit « Bientôt ». Rien n'est effacé ; `COLLECTIF_STYLES=1` sur Vercel rouvre.

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
  il ne vaut que pour une demande dont l'en-tête `host` BRUT est localhost (Vercel n'achemine
  jamais ce nom ; `x-forwarded-host`, lui, s'écrit par l'appelant, T-164). Ni `VERCEL` ni
  `VERCEL_ENV` ne départagent : le `.env.local` tiré de Vercel contient `VERCEL="1"` et
  `VERCEL_ENV="production"`. Une seule route lit l'accès sans le contrôle : `/api/collectif/appareil`.

## « Retrouver mon espace » (T-154, 16/10)

- `/edition/retrouver`, joignable par l'adresse courte `/espace` (`next.config.ts`, 307) : le
  responsable tape son adresse, son lien part par mail À CETTE ADRESSE. ⚠️ **La réponse est la
  même que l'adresse soit connue ou non** (patron `/api/waitlist`) : même corps, même statut, et
  les mails partent APRÈS la réponse (`after`) derrière `delaiNeutre`. Sinon la page serait un
  annuaire des clients.
- C'est la SEULE route publique sans token (le harnais la nomme : `SANS_TOKEN`) : ni
  `chargerAcces` ni `peut`, elle ne lit qu'une adresse (enregistrée en minuscules par
  `saisie.ts`) et n'écrit qu'un verrou de mail. Deux freins : un mail au plus par quart d'heure et
  par édition (`RETROUVER-<quart d'heure>`), qui protège le responsable ; trois demandes par
  minute et par APPELANT (`creerPlafond(3)`, celui de « mot de passe oublié », T-166), 429 avant
  même de lire le corps. Ce second frein compte l'appelant, jamais l'adresse : il ne dit rien de
  la base. Une `Map` par instance Vercel : il freine un script, il n'arrête pas une attaque. Une
  édition archivée ne reçoit rien.
- La page et la route ne regardent QUE `COLLECTIF_MAILS` (`mailsCollectifEnService`) : fermé, la
  page dit « ce service ouvre bientôt » et donne contact@bellajour.com ; en local,
  `ATELIER_MAILS_COUPES` coupe l'envoi lui-même et le serveur note à qui il serait parti.
- La page « lien introuvable » (`edition/not-found.tsx`, la même pour tout lien inconnu) y renvoie ;
  le mail « Votre espace est prêt » cite l'adresse courte.

## Audencia, les lots du 20/10 (T-193 à T-201, T-160, T-168 à T-176)

- **Le rattrapage** (T-194, `rattrapage.ts` pur, `rattrapageServeur.ts`, `rattrapageCoffre.ts`) :
  une ligne déclarée depuis plus de 10 min et jamais confirmée (page fermée, iPhone verrouillé)
  est cherchée au coffre (HEAD, ou un listage au-delà de 50 lignes) et confirmée par LA fonction
  de `depot/complete` (`confirmerArrivee`), même contrôle de taille, jamais une copie. Déclenché
  en `after()` à l'ouverture de la fiche atelier et de la page Photos du RESPONSABLE (pas de
  l'équipe), et chaque jour par la relève (`/api/atelier/mails/relever`, après sa réponse).
  Verrou au journal (`rattrapage_demarre`, 15 min entre deux passages), borné, silencieux quand
  rien n'est à faire, `photos_rattrapees` au journal quand il trouve.
- **Les vignettes fabriquées par le serveur** (T-171, `rattrapageVignettes.ts`) : 320 px, sharp
  pour JPEG/PNG/WebP, libheif-js pour HEIC (son propre chunk), écrite au coffre AVANT sa clé en
  base. Après `depot/complete` et dans le rattrapage.
- **Les pannes visibles** (T-160, `echecs.ts` pur, `noterEchec`) : type `echec` au journal,
  payload court sans token, une ligne par minute et par geste ; bloc « Éditions » de la page
  Santé. Branché sur `depot/presign`, `depot/complete` et le rattrapage ; les autres routes sont
  listées dans T-160.
- **Le lot par lien** (T-193, `lotCollectif.ts`) : `<rang> - <lien> - <personne> - <date> - <nom
  d'origine>`, le lien est une CLÉ (`cleDuLien`, même règle que `dansLeDossier`), jamais un
  libellé ; « Lot - <lien> », « Lot - <lien> - <personne> », sous-dossiers par lien pour tout le
  lot. `src/lib/atelier/lot.ts` reste celui du B2C. Les liens de contribution se voient et se
  créent depuis « Réglages et liens » (T-201, route admin `…/provenances`, journalisée), le QR
  s'affiche en grand et s'imprime (T-197, `imprimer.ts` par `srcdoc`, jamais une page du site).
- **Régénérer** (T-196) dit combien de liens de contribution tombent avec le lien des
  participants (ils contiennent `token_depot`), 409 si le lien a changé entre-temps, mail au
  responsable par le circuit unique (`mailLienRegenere`, origine `origineDesMails`, jamais un
  en-tête : le harnais le vérifie). Un lien mort affiche « Ce lien ne fonctionne plus »
  (`depot/[token]/not-found.tsx`, 404 pour tous, registre retrouvé par `payload.ancien`).
- **La grille sans relecture complète** (T-168, `resumePhotos.ts` pur, `grillePhotos.ts`) : un
  résumé par façon d'avoir déposé (vue `collectif_photos_resume`, migration 20261022) et la seule
  page demandée, filtre du dossier traduit pour PostgREST (`enFiltresPostgrest`) ; sans la vue,
  `grilleDepuisLignes` relit tout comme avant. La route passe DEUX signatures : `signer`
  (vignettes, `signerLectureVignette`, adresse stable à l'heure, cache navigateur, T-176) et
  `signerOriginal` (original de repli, `signerGet`).
- **D26** : accepter une proposition n'engage pas, c'est le devis signé ; la fiche affiche « À
  faire : envoyer le devis à signer » (`devisAEnvoyer`). « Photos seulement : les vidéos ne
  partent pas » est dit avant le choix (T-200).
- **La conservation** (T-159, `retention.ts` pur, `scripts/collectif-retention.ts`) : effacer le
  coffre d'une édition livrée passe par `supprimerCoffreEdition` (garde `collectif/<uuid>/`
  exacte) et la table `FAMILLES` (les PDF des tours et les documents restent). Jamais lancé pour
  effacer : la politique (T-158) n'est pas validée.

## Personnes, corbeille, album, ouverture (lot w1 du 20/10, migration 20261023)

Le contrat des écrans : `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md`. Migration
`20261023_collectif_personnes_corbeille.sql` (écrite le 20/10, à appliquer par Mathias).
- **Une personne, c'est son ADRESSE** (`personnes.ts`, `personnesServeur.ts`,
  `collectif_participants`) : unique par édition, NON vérifiée. Elle reconnaît, elle n'ouvre RIEN :
  ni suppression, ni photo d'un autre lien ou d'un autre téléphone. Un téléphone parle pour une
  personne (`collectif_participants_appareils`). Le nom VIT sur les photos (`deposant`) : renommer
  et fusionner réécrivent les photos ; la grille reste rangée par nom.
- **La corbeille** (`corbeille.ts`, `corbeilleServeur.ts`) : 30 jours, puis la LIGNE PUIS le
  coffre (supprimée, pas anonymisée ; ordre renversé par l'audit, voir plus bas). Un participant ne
  supprime que les photos de CE téléphone.
- ⚠️ **Toute lecture qui montre ou compte des photos passe par `lireHorsCorbeille`**
  (`horsCorbeille.ts`) et pose `.is("supprimee_le", null)` ; sans la colonne, elle se rejoue sans
  (une erreur qui NOMME une colonne de la migration, `personnesAbsentes`). ⚠️ **Un compte filtré
  ainsi se fait en GET `limit(0)` (`COMPTE_SANS_LIGNE`), JAMAIS en `head`** : mesuré le 20/10 sur
  la vraie base, un HEAD filtré sur une colonne absente rend 400 sans code ni message, le repli ne
  joue pas et le dépôt répondrait 500. Une lecture nouvelle de `collectif_photos` suit ce patron
  (le harnais relit les sites).
- **L'album** (`album.ts`) : une photo n'entre dans l'album des AUTRES que sous l'accord du 20/10
  (`VERSIONS_ALBUM`). `VERSION_ACCORD` (ce que la page envoie) reste `2026-10-17` tant que la page
  n'affiche pas la phrase de l'album.
- **L'ouverture** (`ouverture.ts`) : avant `ouverture_le`, le participant est refusé (409
  `depot_pas_ouvert`).
- La purge quotidienne tourne après la relève (`purgeQuotidienne`), comme le rattrapage.

**L'audit de sécurité du lot w1 (20/10, avant la migration ; contrat section 9)** :
- **Une adresse tapée ne rend que le PRÉNOM** (`vuePersonneConnue`) et un nombre de photos : pour
  « connu », `qui` et `moi.participant` de l'album ; le nom complet seulement à la création.
  `nomIgnore` vaut dès qu'un nom est tapé (le dire seulement quand il diffère serait un oracle du
  nom de famille). Une adresse connue se journalise à chaque présentation (`participant_retrouve`)
  et sous un autre nom (`participant_nom_different`) ; la liste le montre (`nomPropose`,
  `nomsProposes`), jamais à l'équipe.
- **`depot/presign` ne lit AUCUNE adresse** : la personne d'une photo est celle de CE téléphone
  (`participantDeLAppareil`). Remettre `email` dans presign rouvre un annuaire sans frein.
- **Une photo de la corbeille ne compte plus dans la place**, qui que soit celui qui l'a supprimée
  (`compteDansLaPlace`) ; la même photo rechoisie reste « déjà là » par sa clé.
- **Les freins du participant** (`freins.ts`) : par adresse du CLIENT et par LIEN (une classe
  derrière le Wi-Fi du campus passe), plus un frein large sur l'adresse que Vercel voit ;
  `presenter` seul compte dans `depot/participant`. Une `Map` par instance : un frein seulement.
- **L'album ne signe jamais l'original** (EXIF, GPS) ; ses comptes viennent de la vue
  `collectif_photos_album` (20261023), sinon `personnes: null`.
- **Le serveur n'accepte qu'une version d'accord ≤ `VERSION_ACCORD`** (`versionAcceptee`) : la
  version de l'album s'accepte le jour où la page l'affiche.
- **Effacer pour de bon** : intention au journal (`objets_a_effacer`, des clés R2), la LIGNE
  re-contrôlée qui rend ses clés, PUIS le coffre, puis `objets_effaces` ; ce qui résiste se retente
  (`reprendreObjets`, en tête de la purge) et une clé qu'une ligne porte encore ne s'efface jamais.
  `effaceur` injectable : le harnais ne touche jamais le vrai coffre.
- ⚠️ **Un texte de client n'entre JAMAIS dans `.in()`** : postgrest-js n'entoure de guillemets
  qu'une valeur à `,()` et n'échappe rien (`Zed","Léa Martin` = deux valeurs, prouvé sur la vraie
  base). `listeIn` / `citerPostgrest` (lignes.ts), posés par `.filter(c, "in", …)`. Les uuid et
  les constantes du code peuvent rester en `.in()`.
- **Une fusion se journalise AVANT d'écrire** (`journaliserId`) ; sans journal, rien ne s'écrit ;
  une panne au milieu écrit `fusion_interrompue` et « défaire » la remet d'aplomb.
- **En attente de Mathias (C3)** : noms au journal après la purge, adresse jamais purgée ; dépend
  de la politique de confidentialité.
- **La grille du responsable (lot w2)** rend `signalee` et `grande` sur chaque vignette (l'original
  signé pour JPEG, PNG, WebP, `afficheEnGrand` ; la vignette pour un HEIC), `compteurs.signalees`
  et la vue `signalees` (« Ne pas publier » : le plan VÉRIFIÉ du dossier + la condition `signalee`,
  jamais posée par `planDuDossier`, comptée par `LectureGrille.compterFiltre`, un GET `limit(0)`),
  `stats.corbeille` (`compterCorbeille`, `null` sans la migration ou pour l'équipe). Les deux
  lectures (résumé et repli) rendent la même réponse pour les quatre vues (harnais a4). Les cochées
  s'écrivent par lots de 500 (`photoIds`), jamais une requête par photo. Sans la migration, la page
  dit « La mise à jour de la base n'est pas encore appliquée », jamais le message de la route.

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
