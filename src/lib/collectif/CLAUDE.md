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
- ⚠️ **Le CORS du coffre** n'accepte que bellajour.fr, www, *.vercel.app et `localhost:3000`
  (vérifié le 13/10 par une requête OPTIONS) : le local de recette des photos tourne donc sur
  3000 (`.claude/launch.json` « Next.js prod 3000 collectif »).

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

Client : monde SOMBRE, `.bj-atelier` + scope propre (`.ec-espace`, `.ec-depot`), noir, blanc,
orange `--c-accent`, Cormorant Garamond **400** (jamais 500 : T-059) et DM Sans. Toute classe
préfixée `ec-` et écrite sous son scope : une feuille chargée ne se décharge jamais en navigation
client. Admin : monde CRÈME, classes de la table de travail. Masculin générique à l'écran
(« le responsable »), même si le PRD écrit « la responsable ».

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
