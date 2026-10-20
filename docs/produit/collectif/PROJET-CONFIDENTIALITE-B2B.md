# PROJET : la confidentialité de l'Édition collective (B2B)

> **Statut : PROJET, À FAIRE RELIRE.** Rien de ce fichier n'est en ligne. Aucun texte légal du site
> (`src/app/legal/content/*`) n'a été modifié : l'intégration attend l'accord explicite de Mathias
> et la relecture juriste du lot juridique (`docs/produit/LOT-JURIDIQUE.md`, le portugais fait foi).
> Tickets : T-158 (la politique), T-159 (la conservation). Rédigé le 20/10/2026 depuis le code.
> Toute qualification juridique ci-dessous (rôle, base légale, durée légale) est une PROPOSITION ;
> là où je ne suis pas sûr, c'est écrit « à faire relire ».

Décisions de Mathias déjà prises, et intégrées ici :

- **20/10** : « il faut qu'on mette en place la politique de confidentialité ».
- **20/10** : les photos d'une édition se gardent « 30 jours, un truc comme ça, après la réception de
  la livraison » (à confirmer : le chiffre n'est écrit nulle part dans le code, le script l'exige en
  argument).
- **20/10** (transmises par le coordinateur, **pas encore codées**, vérifié : aucune trace dans
  `src/`) :
  1. chaque participant donnera la première fois son **prénom, son nom ET son adresse e-mail**, non
     vérifiée pour l'instant, qui sert à le reconnaître sur tous ses appareils et tous les liens ;
  2. un participant **verra les photos des autres personnes de son lien** (« l'album du bateau ») ;
  3. une photo supprimée par le responsable ou par son auteur part dans une **corbeille 30 jours**,
     puis est effacée.

---

## 0. Ce que Mathias doit trancher (la page à lire)

| # | Question | Ce que je propose | Pourquoi ça bloque |
|---|---|---|---|
| Q1 | **Qui est responsable des données des participants ?** Bellajour sous-traitant de l'entreprise (A), responsable autonome (B), ou responsables conjoints (C) | A pour les photos et les noms des participants, Bellajour responsable autonome pour ses propres données (contact du responsable, facturation, journal). **À faire relire, c'est le point central.** | La politique actuelle dit le contraire (§1 : « Bellajour n'est pas le sous-traitant du client »), et le texte d'accord du dépôt fait parler Bellajour en son nom. Le modèle de DPA (§6) n'a de sens que dans l'hypothèse A. |
| Q2 | **Le délai** : 30 jours après « Marquer livrée » ? | 30 jours, écrits dans la politique, et le script lancé à une cadence fixe (proposé : chaque semaine), donc une promesse « au plus tard 30 jours plus une semaine ». | Le script n'a pas de cron (volontaire, comme T-076) : une promesse « 30 jours pile » ne serait tenue que si quelqu'un le lance ce jour-là. |
| Q3 | **Le PDF final** (et ceux de chaque tour) : on le garde au-delà des 30 jours pour une réimpression ? Combien de temps ? | Le garder, pour une durée que Mathias fixe (je n'en invente aucune). En attendant, le script le GARDE. | Le PDF contient les photos retenues : tant qu'il est gardé, la phrase « vos photos sont supprimées » est fausse pour celles-là. La politique doit le dire. |
| Q4 | **Les documents** (devis signé, factures, propositions) : même durée que les preuves comptables du B2C ? | Oui : la politique actuelle écrit « 10 ans » pour « commandes, factures et preuves de validation » (Código Comercial art. 40, CIVA / SAF-T). À faire relire pour un client entreprise. En attendant, le script les GARDE. | Effacer un devis signé 30 jours après la livraison, c'est perdre le contrat. |
| Q5 | **La preuve de l'accord** (nom du participant, version du texte, heure) : on la garde après les photos ? | Oui, le temps où une réclamation sur le magazine imprimé reste possible ; durée à faire relire. Le script la GARDE aujourd'hui. | Le magazine, lui, existe toujours sur papier : sans preuve, plus rien ne montre que la personne avait accepté. |
| Q6 | **L'e-mail du participant** (décision du 20/10, pas encore codé) : effacé avec les photos ? | Oui, effacé avec les photos (il ne sert qu'à reconnaître la personne pendant la collecte), et jamais utilisé pour de la prospection. | Il faut le dire dans la politique ET dans la page de dépôt au moment où on le demande. |
| Q7 | **Une adresse non vérifiée peut-elle OUVRIR quelque chose ?** | Non : elle peut nommer et regrouper, jamais donner accès à des photos d'un autre lien. | Avec « l'album du lien » et la reconnaissance « sur tous les liens », taper l'adresse d'un collègue ne doit pas montrer ses albums. C'est un point de conception à tenir quand on codera la décision 1. |
| Q8 | **Les écoles** : des participants mineurs déposent et cochent l'accord. | Ne rien ouvrir aux écoles sans relecture. | La politique actuelle (§6.3) dit « le service n'est pas destiné aux moins de 18 ans » ; une édition `ecole_tu` invite des élèves. L'âge du consentement numérique dépend de l'État membre (RGPD art. 8) : à faire relire. |
| Q9 | **Le texte d'accord du dépôt** (texte légal, version `2026-10-17`) : une nouvelle version qui dit qui voit les photos, combien de temps, et qui renvoie à la politique ? | Oui, proposition au §5. Une version ne se retire jamais : des photos portent l'actuelle. | Avec la décision 2 (album du lien), les photos d'un participant deviennent visibles par d'autres participants : il doit le savoir AVANT d'envoyer. |
| Q10 | **Les CGV** ne parlent que d'un consommateur (art. 1.1). Des conditions B2B ? | Un document à part pour les entreprises (conditions de l'Édition collective + DPA en annexe). À rédiger avec la relecture. | Aujourd'hui aucun texte ne régit la relation avec une entreprise : seul le devis signé. |

---

## 1. Ce que l'Édition collective collecte et garde aujourd'hui (relevé du code, 20/10/2026)

Les chemins sont relatifs au dépôt ; « 20261013 » désigne `supabase/migrations/20261013_collectif.sql`.

### 1.1 Le client entreprise et son responsable

| Donnée | Où | Remarque |
|---|---|---|
| Organisation, événement, dates (texte libre) | `collectif_editions.organisation`, `evenement`, `dates_texte` (20261013:72-74) | saisis par l'atelier |
| **E-mail du responsable** (obligatoire, en minuscules) | `collectif_editions.responsable_email` (20261013:101) ; règle `src/lib/collectif/saisie.ts:285-290` | sert aux mails (Brevo), à « Retrouver mon espace », au code d'appareil |
| Nom du responsable (facultatif, 120 caractères) | `responsable_nom` (20261013:102) ; `saisie.ts:50,283` | affiché « Bonjour … », écrit dans l'événement d'agenda |
| **Téléphone** | **non collecté** (aucun champ dans `saisie.ts`, `types.ts`, la migration) | |
| Adresse de livraison, transporteur, numéro de suivi, dates d'expédition et de livraison | `collectif_editions.livraison` (jsonb, 20261013:105-106 ; forme dans `src/lib/collectif/types.ts:97-106`) | l'adresse peut contenir le nom d'une personne |
| Trois liens au porteur (responsable, équipe, dépôt) | `token_responsable`, `token_equipe`, `token_depot` (20261013:69-71) | le lien EST l'identité ; jamais dans le journal (`journal.ts:11`) |
| Appareils reconnus du responsable | `collectif_appareils` (`supabase/migrations/20261019_collectif_appareils.sql:42`) : **empreinte sha256** de l'identifiant, jamais l'identifiant (`src/lib/collectif/appareil.ts:52-60`) | reconnu un an (`appareil.ts:27`) |
| Codes envoyés par mail | `collectif_codes` (20261019:22) : empreinte du code liée à l'appareil, 24 h, 10 essais (`appareil.ts:33-37`) | les lignes ne sont jamais purgées |
| Rendez-vous | `collectif_rendez_vous` (`20261015_collectif_rendez_vous.sql:46-58`) : créneau, **motif (500 caractères)**, identifiant d'événement Google | l'événement posé dans l'agenda de l'interlocuteur porte **le nom et l'e-mail du responsable** et le motif (`src/lib/collectif/rendezvous.ts:107-112`) ; l'agenda n'est lu qu'en « libre / occupé » (`agenda.ts`) |

### 1.2 Les participants (le lien `/depot/<token>`)

| Donnée | Où | Remarque |
|---|---|---|
| **Prénom et nom** (exigés la première fois, 80 caractères) | `collectif_photos.deposant` (20261013:214-215) ; règle `src/lib/collectif/participant.ts:11-19,23` ; écrit par `src/app/api/collectif/depot/presign/route.ts:92,119-123,161` | une fois donné, le serveur le reprend pour cet appareil (`participantConnu.ts:21-45`) |
| **E-mail du participant** | **pas encore collecté** (décision du 20/10, non codée) | voir Q6, Q7 |
| Les photos (originaux tels quels, HEIC compris) et leur vignette de 320 px | coffre R2 `collectif/<édition>/photos/<id>/original.<ext>` et `vignette.jpg` (`src/lib/collectif/cles.ts:55-63`) | des milliers par édition ; jamais copiées dans le navigateur (`moteur.ts`) |
| Nom d'origine du fichier, type, taille, ordre | `nom_origine`, `mime`, `taille`, `ordre` (20261013:205-209) | |
| Clé de reprise `sel~nom|taille|date` | `cle_fichier` (20261013:204, `src/lib/collectif/cleDepot.ts`) | **contient aussi le nom d'origine** ; colonne obligatoire et unique |
| **Ce que la photo sait d'elle-même** : date et heure de prise de vue, appareil photo, **coordonnées GPS**, dimensions, empreinte perceptuelle (doublons), luminance | `prise_le`, `appareil`, `gps_lat`, `gps_lon`, `largeur`, `hauteur`, `empreinte`, `luminance` (20261013:220-228), écrits par `src/lib/collectif/enrichissement.ts:63-73` | lus dans le fichier après l'arrivée |
| **Ville et pays** déduits du GPS | `lieu_ville`, `lieu_pays`, `lieu_code_pays` (20261013:229-232), `enrichissement.ts:90-125` | **les coordonnées partent chez Geoapify** (`src/lib/atelier/geocodage.ts:26`), une requête par lieu ; la clé est posée en production (`docs/reference/ETAT-PRODUCTION.md:476`) |
| Identifiant d'appareil (16 octets aléatoires) | `collectif_photos.appareil_id` (20261013:216-217), `src/lib/collectif/collecte.ts:19-22` | sert au plafond PAR APPAREIL et à retrouver le nom |
| **L'accord** : version du texte et heure du serveur | `accord_version`, `accord_le` (`20261020_collectif_accord_participant.sql:39,44`) ; refus sans accord `presign/route.ts:77-82` ; texte `src/lib/collectif/accord.ts:41-46` | migration appliquée le 19/10 |
| Lien d'envoi utilisé (provenance) et son nom | `provenance_id`, `provenance_type` (20261013:210-211), `collectif_provenances.libelle` (20261013:178-187) | un nom de lien peut nommer une personne (« Les photos de Léa ») |
| Présélection, signalement « à ne pas publier » et son motif | `preselection`, `signalee`, `signalement_motif` (20261013:233-235) | posés par le responsable ; rien ne s'efface (`photos/marquer/route.ts:23`) |

### 1.3 Les échanges

| Donnée | Où |
|---|---|
| Messages client ↔ atelier : auteur, **nom de qui écrit**, texte, lus le | `collectif_messages` (20261013:354-363) ; réponses, envois cités (20261016, 20261018) |
| Pièces jointes des messages (4 Mo, par le serveur) | `piece_jointe_key`, `piece_jointe_nom` (`20261014_collectif_revision.sql:36-38`) ; coffre `collectif/<édition>/messages/<id>.<ext>` (`cles.ts:125-128`) |
| Contenus envoyés par le client (logo, programme, **liste des participants**, rubrique…) et les **réponses du questionnaire du mot du dirigeant** | `collectif_contenus` (20261013:253-264 : `r2_key`, `nom_origine`, `reponses` jsonb, `depose_par`) ; coffre `collectif/<édition>/contenus/` |
| Documents posés par l'atelier (devis signé, factures, propositions) | `collectif_documents` (20261013:371-380) ; coffre `collectif/<édition>/documents/` |
| Notes du bon à tirer | `collectif_notes` (20261013:324-346) |
| Tours du BAT : PDF source (jamais servi au client), pages rendues, miniatures, gris, couvertures proposées | `collectif_tours`, `collectif_couvertures` (20261013:271-305) ; coffre `collectif/<édition>/tours/<tour>/` (`cles.ts:65-113`) |

### 1.4 Le journal et les mails

- `collectif_evenements` (20261013:390-400) : chaque écriture, avec `qui` (le nom de qui agit) et un
  `payload` ; **jamais un lien au porteur** (`journal.ts:11`) ; les adresses y sont **masquées**
  (`a***@domaine`, `appareil.ts:87-91`, `mails.ts:97-104`).
- `collectif_mails` (20261013:413-421) : un verrou par mail (code, date), sans adresse.
- Les mails partent par Brevo, à l'adresse du responsable (`mails.ts:29-30,86`). **`COLLECTIF_MAILS`
  est fermé** à ce jour (`docs/reference/ETAT-PRODUCTION.md:51`) : aucun mail d'édition ne part.

### 1.5 Sur l'appareil de la personne

| Nom | Type | Contenu | Durée | Où |
|---|---|---|---|---|
| `bj_depot_appareil` | cookie httpOnly, `path=/` | identifiant aléatoire d'appareil du participant | 1 an | `collecte.ts:12` ; posé `presign/route.ts:207-214` |
| `bj_ec_appareil` | cookie httpOnly | identifiant aléatoire (32 octets) de l'appareil du responsable ; la base n'en garde que l'empreinte | 1 an | `appareil.ts:25-27` ; `appareils.ts:21-24` ; posé `api/collectif/appareil/route.ts:63-68` |
| `bj_ec_mode` | cookie, `path=/edition` | préférence jour / nuit, rien de personnel | 1 an | `affichage.ts:15,24-26` |
| `bj-depot-prenom` | localStorage | le nom du participant, sur son téléphone | jusqu'à effacement par le navigateur | `src/app/depot/[token]/Depot.tsx:47-58` |
| `bj-depot-sel` | localStorage | un sel aléatoire de l'appareil (clé de reprise) | idem | `src/app/edition/_composants/depot/moteur.ts:189-200` |

La mesure d'audience (Vercel Web Analytics) **masque** `/edition/<token>` et `/depot/<token>` avant
tout envoi (`src/lib/analytics/chemin.ts`).

### 1.6 Où c'est stocké

- **Base** : Supabase, région `eu-west-1` (Irlande) (`docs/reference/ETAT-PRODUCTION.md:121-122`),
  service key côté serveur, RLS activée sans policy (20261013:496-510).
- **Coffre** : Cloudflare R2, tout sous `collectif/<uuid de l'édition>/` (`cles.ts`). L'adresse du
  coffre lue dans le `.env.local` local le 20/10 est celle de la **juridiction UE** (`.eu.r2…`) ;
  celle de la Production Vercel n'a pas été lue (non vérifié).
- **Fonctions** : Vercel, région Dublin `dub1` (`ETAT-PRODUCTION.md:121`) ; Vercel Inc. est établie
  aux États-Unis (la politique actuelle le déclare, §9).
- **Hors du coffre** : les lots que l'atelier télécharge (`api/admin/collectif/editions/[id]/lot/route.ts:12-24`)
  s'écrivent sur les ordinateurs de l'atelier ; les fichiers de travail de la composition aussi.

### 1.7 Qui y accède

- **L'atelier** (comptes nominatifs Mathias et Louis, `src/lib/admin-auth.ts:55-56`, cookie `bj_admin`
  de 7 jours) : tout, et le téléchargement des lots avec le nom de qui a déposé.
- **Le responsable** (son lien) : toutes les photos de l'édition, avec le nom de chaque personne
  (`api/collectif/photos/route.ts:63-66,146`), les messages, les documents, les liens d'envoi.
- **L'équipe** (le lien d'équipe, « fait pour être partagé », `appareil.ts:12-13`) : en lecture, les
  mêmes photos et les mêmes noms ; jamais les liens d'envoi.
- **Le participant** : aujourd'hui, seulement son nom et le nombre de ses photos arrivées
  (`participantConnu.ts:47-60`). **Décision du 20/10, pas encore codée : il verra les photos des
  autres personnes de son lien.**
- **Les sous-traitants techniques** du §3.7.

### 1.8 Combien de temps, aujourd'hui

**Sans limite.** Rien n'efface les photos d'une édition (T-159) ; « Archiver » garde tout
(`gestes.ts:160` : un marqueur, pas un état) ; aucune ligne de `collectif_codes`,
`collectif_appareils`, `collectif_evenements` n'est jamais purgée ; `photos_supprimees_le`
(20261013:111) existait comme accroche mais n'était lue ni écrite nulle part. Le texte d'accord du
dépôt ne promet aucune durée (`Depot.tsx:7-10`).

---

## 2. Ce que disent déjà les textes du site

Lu le 20/10 dans `src/app/legal/content/` (versions affichées : CGV 4.0 du 16/09/2026,
confidentialité 3.1 du 13/06/2026).

- **CGV art. 1.1** (`cgv.ts:90`) : elles régissent « toute commande passée par un **consommateur** ».
  Un client entreprise n'est couvert par **aucun** article. Les droits du consommateur (libre
  résolution, garanties, juridiction) ne se transposent pas d'office.
- **CGV art. 4bis.2** (`cgv.ts:135`) : la seule durée de conservation des CGV vise les particuliers :
  « Un dossier laissé sans suite […] est conservé 90 jours à compter du dépôt, puis ses photographies
  sont supprimées après un préavis par e-mail adressé 7 jours avant » (T-076). **Rien sur les photos
  après la livraison.**
- **CGV art. 11.3** (`cgv.ts:247`) : stockage dans l'UE, renvoi à la politique.
- **Politique §1** (`confidentialite.ts:33`) : « Bellajour n'est pas le sous-traitant du client. »
  Vrai pour un particulier qui commande son album ; à revoir pour une entreprise (Q1).
- **Politique §6.3** (`confidentialite.ts:88`) : service non destiné aux moins de 18 ans. À
  confronter aux éditions d'école (Q8).
- **Politique §7** (`confidentialite.ts:96`) : « Photos téléversées + fichier HD : supprimées 90 jours
  après la livraison ». ⚠️ **Écart B2C relevé en passant, hors de ce lot** : le seul effacement codé
  (`scripts/anonymiser-dossiers.ts`, `src/lib/atelier/retention.ts`) épargne précisément les dossiers
  payés et livrés (`ETATS_ENGAGES`, `retention.ts:117-123`). La promesse des 90 jours après livraison
  n'est tenue par aucun code. C'est déjà en partie le point 7 de `LOT-JURIDIQUE.md`.
- **Politique §8** (`confidentialite.ts:110`) : cookies « session, panier » et pixel Meta. Aucun des
  cookies de l'Édition collective (§1.5) n'est déclaré.
- **Politique §9** (`confidentialite.ts:123-135`) : ne cite ni **Geoapify** (qui reçoit des
  coordonnées GPS) ni **Google** (agenda des rendez-vous). ⚠️ Autre écart B2C relevé en passant : AWS
  Rekognition, OpenAI et Fal.ai y sont déclarés, mais aucun de ces services n'apparaît dans `src/`
  (seule occurrence : `confidentialite.ts` lui-même). À trancher dans le lot juridique.
- **Mentions légales §2 et §9** (`mentions-legales.ts:38-42,113-115`) : hébergeur Vercel, renvoi à la
  politique. Rien à changer pour le B2B, sinon le renvoi vers la nouvelle section.
- **Le texte d'accord du dépôt** (`Depot.tsx:148-151`, version `2026-10-17`) ne renvoie à aucune
  politique : la page `/depot` n'a aucun lien vers `/confidentialite` (vérifié par recherche dans
  `src/app/depot` et `src/app/edition`).

**Conclusion** : la durée de 30 jours voulue par Mathias pour le B2B ne contredit aucun texte (le
B2C a ses propres durées), mais **aucun texte ne parle aujourd'hui d'un client entreprise ni d'un
participant**. Il faut une section nouvelle, et la dire au participant AVANT qu'il envoie.

---

## 3. La section à ajouter à la politique de confidentialité (projet de texte)

*Projet, à faire relire. Rédigé en français ; la version portugaise, qui fait foi, et l'anglaise
restent à produire avec la relecture. Écrit dans l'hypothèse A de Q1 ; les phrases qui changent
selon la réponse sont marquées [A] / [B].*

### 13. L'Édition collective (entreprises, écoles, associations)

**13.1 De quoi il s'agit.** Une organisation (« le client ») confie à Bellajour la composition d'un
ou de plusieurs magazines de son événement. Elle invite des personnes (« les participants ») à
envoyer leurs photos par un lien. Le client désigne un responsable, qui suit l'édition dans un
espace en ligne et peut le partager en lecture avec son équipe.

**13.2 Qui est responsable de quoi.**
[A] Pour les photos et les noms des participants, Bellajour agit **pour le compte du client** et
selon ses instructions : le client est responsable du traitement, Bellajour est son sous-traitant
(RGPD, art. 28). Un accord de sous-traitance est conclu avec le client. Pour ses propres données de
gestion (le contact du responsable, la facturation, la sécurité de ses services), Bellajour reste
responsable du traitement.
[B] Bellajour est responsable du traitement des photos et des noms des participants, comme pour un
particulier (§1).
*À faire relire : le choix entre [A], [B] et une responsabilité conjointe (art. 26).*

**13.3 Les données, les finalités, la base légale.**

| Personne | Données | Finalité | Base légale (proposée, à faire relire) |
|---|---|---|---|
| Responsable | nom, adresse e-mail, nom de l'organisation et de l'événement, adresse de livraison | exécuter la commande, échanger, livrer, facturer | exécution du contrat avec le client (6.1.b) |
| Responsable | rendez-vous pris : date, sujet ; son nom et son adresse figurent dans l'invitation | organiser les rendez-vous avec l'atelier | exécution du contrat (6.1.b) |
| Responsable | identifiant aléatoire de l'appareil (cookie), et en base seulement son empreinte ; code à usage unique par e-mail | réserver les modifications de l'espace aux appareils reconnus | intérêt légitime de sécurité (6.1.f) |
| Participant | prénom et nom ; **adresse e-mail (à venir)** | reconnaître la personne d'un appareil à l'autre et d'un lien à l'autre, ranger ses photos sous son nom | [A] instruction du client ; [B] consentement exprimé par la case d'accord (6.1.a), à faire relire |
| Participant | photos ; leur nom de fichier ; la date, l'heure, l'appareil photo et les coordonnées GPS lus dans le fichier ; la ville et le pays qui s'en déduisent ; une empreinte de l'image | composer le magazine ; repérer les doublons ; classer les photos par jour et par lieu | idem |
| Participant | la version du texte accepté et l'heure de l'acceptation | prouver l'accord donné | intérêt légitime (6.1.f) / obligation de preuve, à faire relire |
| Participant | identifiant aléatoire de l'appareil (cookie) | tenir le nombre de photos par personne | intérêt légitime (6.1.f) |
| Tous | messages, pièces jointes, contenus envoyés (logo, programme, liste, réponses au questionnaire) | composer le magazine, échanger avec l'atelier | exécution du contrat (6.1.b) |
| Tous | journal des actions (qui a fait quoi, quand), adresses masquées | sécurité, preuve, résolution des litiges | intérêt légitime (6.1.f) |

Bellajour ne déduit des photos **aucune donnée sensible** et ne réalise **aucune reconnaissance
des visages** pour l'Édition collective (vérifié dans le code le 20/10 : aucun traitement de ce
type). Les photos ne servent à rien d'autre qu'au magazine de l'édition : ni prospection, ni
portfolio, ni entraînement d'un modèle, sauf accord séparé et explicite.

**13.4 Qui voit vos photos.**
- l'atelier Bellajour ;
- le responsable de l'édition, et les personnes à qui il partage le lien d'équipe (en lecture) :
  toutes les photos, avec le nom de qui les a envoyées ;
- **les personnes qui envoient sur le même lien que vous** voient les photos de ce lien et le nom
  de qui les a envoyées (à mettre en ligne avec la fonction, décision du 20/10) ;
- les lecteurs du magazine imprimé, pour les photos retenues.
Le lien de dépôt n'est pas public : il est transmis par le client. Il n'est indexé par aucun
moteur de recherche (en-tête `noindex`) et ne passe jamais dans la mesure d'audience.

**13.5 Combien de temps.**

| Donnée | Conservation (proposée) | État dans le code |
|---|---|---|
| Photos (originaux, vignettes), leurs métadonnées (date, appareil, GPS, ville, empreinte, nom de fichier), les rendus du bon à tirer, les contenus envoyés, les pièces jointes | **supprimés 30 jours après la livraison** (à confirmer, Q2), au plus tard [30 jours + cadence] | script `scripts/collectif-retention.ts` prêt, jamais lancé pour effacer |
| Une photo supprimée par le responsable ou par la personne qui l'a envoyée | **30 jours dans une corbeille, puis effacée** (décision du 20/10) | pas encore codé |
| Adresse e-mail du participant | supprimée avec ses photos (Q6) | pas encore collectée |
| Le PDF du magazine composé (chaque tour) | **[durée à fixer par Mathias, Q3]** pour permettre une réimpression | gardé par le script en attendant |
| Nom du participant, version et heure de son accord | **[durée à fixer, Q5]** | gardés par le script en attendant |
| Devis signé, factures, documents de l'atelier | 10 ans (obligation comptable portugaise, déjà écrite au §7 pour les commandes) ; à faire relire pour un client entreprise | gardés par le script |
| Coordonnées du responsable, messages, journal | [à aligner, proposé : la durée « compte client » du §7, 3 ans après le dernier contact] ; à faire relire | aucune purge codée |
| Cookies d'appareil (§13.8) | 1 an | codé |
| Codes à usage unique | valables 24 heures ; [ligne effacée à la suppression des photos, à coder] | lignes jamais purgées aujourd'hui |

La date de départ est celle à laquelle l'atelier constate la livraison (« Marquer livrée »). Une
édition archivée suit la même règle : l'archive ne prolonge rien.

**13.6 Vos droits.** Accès, rectification, effacement, limitation, opposition, portabilité, retrait
de votre accord pour l'avenir. [A] Pour les photos d'une édition, adressez-vous au client qui vous a
invité ; vous pouvez aussi écrire à contact@bellajour.com, qui transmet au client et l'assiste.
[B] Écrivez à contact@bellajour.com. Retirer votre accord retire vos photos de l'édition tant que
le magazine n'est pas imprimé ; une photo déjà imprimée ne peut plus être retirée du papier (à faire
relire). Réclamation : CNPD (www.cnpd.pt).

**13.7 Les sous-traitants de l'Édition collective.**

| Prestataire | Rôle | Localisation | Source |
|---|---|---|---|
| Supabase | base de données | UE, Irlande (`eu-west-1`) | `ETAT-PRODUCTION.md:122` |
| Cloudflare R2 | stockage des photos, PDF, documents | juridiction UE (adresse `.eu.r2`, lue en local) ; Cloudflare, Inc. aux États-Unis | `.env.local` local, la politique §9 |
| Vercel | hébergement, fonctions (Dublin), mesure d'audience sans cookie | Vercel Inc., États-Unis | `ETAT-PRODUCTION.md:121`, politique §9 |
| Brevo | e-mails au responsable (aujourd'hui coupés) | UE (France) | `mails.ts:30`, politique §9 |
| **Geoapify** | ville et pays à partir des coordonnées GPS des photos | **à vérifier** | `geocodage.ts:26` |
| **Google** (Agenda) | rendez-vous : lecture libre / occupé, événement dans l'agenda de l'interlocuteur | **à vérifier** (compte de service pas encore posé, `ETAT-PRODUCTION.md:263`) | `agenda.ts`, `rendezvous.ts` |
| Imprimeur | impression des magazines | **à compléter par Mathias** : l'impression des éditions ne passe par aucun outil du code | `gestes.ts:130-138` |

**13.8 Les cookies et le stockage sur votre appareil.** `bj_depot_appareil` et `bj_ec_appareil`
(identifiants aléatoires, un an, nécessaires au fonctionnement du dépôt et à la sécurité de
l'espace), `bj_ec_mode` (votre choix jour ou nuit, un an), et dans la mémoire du navigateur votre
nom et un sel aléatoire, pour ne pas vous les redemander. Aucun ne sert à la publicité ni au suivi
d'un site à l'autre. *À faire relire : le régime des préférences et du localStorage au regard de la
directive ePrivacy (art. 5.3).*

**13.9 Les mineurs.** *[À écrire après Q8.]*

---

## 4. La règle de conservation (T-159) telle qu'elle est préparée

- **Le module pur** : `src/lib/collectif/retention.ts` (`verdictRetention`, `FAMILLES`,
  `PATCH_PHOTO_EFFACEE`), éprouvé par `scripts/verif-collectif.ts`.
- **Le script** : `scripts/collectif-retention.ts --jours N [--edition <uuid>] [--vraiment]`.
  `--jours` obligatoire, aucune valeur par défaut. Lecture seule sans `--vraiment`.
- **Qui** : une édition à l'état `livree`, dont `livraison.livree_le` est lisible et vieux d'au moins
  N jours, pas encore effacée. Jamais en impression, jamais expédiée sans livraison constatée, jamais
  sans date. L'archive n'épargne rien.
- **Ce qui part** : photos et vignettes, rendus du bon à tirer (pages, miniatures, gris,
  couvertures proposées), contenus envoyés, pièces jointes. **Ce qui reste** en attendant Q3/Q4 :
  le PDF de chaque tour, les documents de l'atelier, toute clé non reconnue.
- **Les lignes** : aucune supprimée ; dans `collectif_photos` sont vidés `vignette_key`,
  `nom_origine`, `appareil_id`, `prise_le`, `appareil`, `gps_lat`, `gps_lon`, `empreinte`,
  `lieu_ville`, `lieu_pays`, `lieu_code_pays`. Restent `deposant`, `accord_version`, `accord_le`
  (Q5) et `r2_key`. Puis `photos_supprimees_le` est posé et le journal écrit `coffre_efface`.
- **La porte du coffre** : `supprimerCoffreEdition` (`src/lib/atelier/r2.ts`), qui n'accepte que
  `collectif/<uuid>/` (`racineEffacable`) ; le geste B2C `supprimerPrefixe` n'accepte toujours que
  `numeros/<id>/`. Un préfixe vide, `collectif/`, les styles, un uuid mal formé sont refusés avant
  tout appel au coffre (prouvé par les deux harnais).
- **Lecture réelle du 20/10** (sans `--vraiment`) : 10 éditions en base, 9 pas encore livrées ;
  « Essai livraison (Claude) » (archivée, livrée le 13/10) serait la seule concernée à 1 jour :
  20 rendus du BAT et 1 pièce jointe effacés, 1 PDF et 2 documents gardés. À 30 jours : aucune.

**Avant le premier `--vraiment`** (à faire, hors de ce lot) :
1. les écrans de l'espace et de la fiche doivent lire `photos_supprimees_le` (aujourd'hui une édition
   effacée montrerait des vignettes vides) ;
2. une procédure pour les copies hors du coffre (lots téléchargés par l'atelier, fichiers de
   travail) : sans elle, la phrase « supprimées » n'est vraie que pour le coffre ;
3. vérifier si le bucket R2 garde des versions ou des sauvegardes (un objet effacé y survivrait), et
   ce que gardent les sauvegardes Supabase et les journaux de Brevo et Vercel (non vérifié) ;
4. `cle_fichier` porte encore le nom d'origine du fichier : colonne obligatoire et unique, qu'une
   seule écriture ne peut pas réécrire ligne par ligne ; une petite migration (une fonction SQL) le
   ferait, à décider ;
5. la corbeille de 30 jours (décision du 20/10) : quand elle existera, son effacement sera une
   seconde règle de `retention.ts`, passée par le même script et la même porte.

### 4 bis. Mise à jour du 20/10 au soir (décisions de Mathias, Q4, Q5, Q6)

Ce qui précède décrit le lot du 20/10 après-midi ; voici ce qui a changé (branche
`feat/effacements-30-et-90-jours`, non fusionnée) :
- **Q4, le délai** : 30 jours après « Marquer livrée », écrit dans le code (`DELAI_RETENTION_JOURS`) ;
  `--jours` ne sert plus qu'à regarder (jamais plus court que 30 pour effacer). Le script reste le
  geste manuel des premières fois ; un passage quotidien après la relève suit le même chemin, **coupé**
  tant que `COLLECTIF_RETENTION_AUTO` n'est pas posé. La promesse « 30 jours » ne sera vraie au jour
  près qu'une fois ce passage ouvert (à défaut, « au plus tard » le prochain passage manuel).
- **Q5, le PDF du magazine terminé** : GARDÉ **10 ans après la livraison**, jamais réutilisé sans
  l'accord du client. La règle des dix ans est écrite (`verdictConservationPdf`), rien ne l'applique.
  Proposition non décidée : seul le PDF du DERNIER tour d'un magazine validé a besoin des dix ans ;
  ceux des tours précédents pourraient partir avec les photos. Tant que ce n'est pas tranché, la phrase
  « vos photos sont supprimées » reste fausse pour les photos retenues dans le magazine : la politique
  doit le dire (« le fichier du magazine imprimé est conservé 10 ans »).
- **Q6, l'adresse e-mail des participants** : supprimée avec les photos (les lignes
  `collectif_participants` et `collectif_participants_appareils` partent ; la preuve de l'accord, Q7,
  reste sur les photos). ⚠️ Le journal garde l'adresse MASQUÉE et les noms (C3, non tranché).
- **L'ordre** est désormais celui de l'audit S7 (intention au journal, base, marqueur en dernier, puis
  le coffre, reprise de ce qui résiste) ; la porte est `supprimerClesEdition`, qui relit `FAMILLES`.
- **Le prérequis 1 est fait** : les écrans de l'espace et de la fiche lisent `photos_supprimees_le`
  (sauf les pièces jointes des messages, qui se signent encore). Les prérequis 2, 3 et 4 restent.
- **Lecture réelle du 20/10 au soir** (sans `--vraiment`) : 11 éditions, 10 pas livrées, 1 livrée il y
  a 7 jours : aucune à effacer.

---

## 5. Le texte d'accord du dépôt : proposition de nouvelle version

*Texte légal : rien n'est changé sur le site. Le jour où Mathias valide, c'est une NOUVELLE entrée
de `TEXTES_ACCORD` (`src/lib/collectif/accord.ts`), rendue courante ; la version `2026-10-17` ne se
retire jamais (des photos la portent). Le harnais compare le texte affiché à la version courante.*

Aujourd'hui (version `2026-10-17`) :

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} » {deOrganisation},
> et je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit.

Proposition (vous ; la version « tu » se transpose) :

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} » {deOrganisation}.
> Elles seront visibles, avec mon nom, par l'organisateur, son équipe et les personnes qui envoient
> sur ce lien, et supprimées 30 jours après la livraison du magazine. Je confirme avoir le droit de
> les partager, y compris pour les personnes qu'on y voit.

Et, sous la case, un lien « Comment Bellajour traite vos données » vers la section 13. Quand
l'adresse e-mail sera demandée (décision 1), une phrase à côté du champ : « Elle sert seulement à
vous reconnaître sur un autre téléphone ou un autre lien. Nous ne vous écrirons pas pour autre
chose. » (à faire relire ; à ne publier que si c'est vrai dans le code).

---

## 6. Modèle court d'accord de sous-traitance (DPA) pour l'entreprise cliente

*Projet, à faire relire. Valable dans l'hypothèse A de Q1. Annexé au devis signé. Les crochets sont
à remplir par édition.*

**Accord de sous-traitance des données personnelles (RGPD, art. 28)**

Entre **[raison sociale du client]**, [adresse], représenté par [nom, fonction] (« le Client »,
responsable du traitement), et **MISTÉRIO HERMÉTICO, LDA** (marque Bellajour), NIPC 519443284, Beco
de Santa Helena, 21A, 2.º, 1100-117 Lisbonne, Portugal (« Bellajour », sous-traitant).

1. **Objet.** Bellajour compose et fait imprimer le ou les magazines de l'édition « [événement] »
   décrite au devis n° [référence]. Pour cela, Bellajour traite pour le compte du Client les données
   personnelles décrites ci-dessous, et uniquement sur ses instructions documentées : le devis, le
   présent accord, et les réglages que le Client fait dans son espace.
2. **Durée.** Le présent accord vaut le temps de l'édition et prend fin à la suppression des données
   prévue à l'article 9.
3. **Nature et finalité.** Collecte de photos par des liens d'envoi, stockage, tri, sélection,
   composition, bon à tirer, impression et livraison du magazine ; échanges avec le responsable.
4. **Personnes concernées.** Les participants invités par le Client ; les personnes visibles sur les
   photos ; le responsable et l'équipe du Client.
5. **Données.** Prénom, nom et adresse e-mail des participants ; photos et les métadonnées qu'elles
   portent (date, heure, appareil, coordonnées GPS, ville et pays déduits) ; version et heure de
   l'accord du participant ; identifiants aléatoires d'appareil ; messages, pièces jointes et
   contenus transmis. Aucune donnée sensible n'est recherchée ni déduite ; aucune reconnaissance des
   visages.
6. **Engagements du Client.** Le Client informe les personnes qu'il invite, détermine la base légale
   du traitement, s'assure des droits sur les photos et du droit à l'image des personnes
   photographiées, et, pour des participants mineurs, [clause à écrire après Q8].
7. **Engagements de Bellajour.**
   - ne traiter les données que sur instruction du Client, et l'avertir si une instruction lui
     paraît contraire au RGPD ;
   - n'en faire aucun autre usage (ni prospection, ni portfolio, ni entraînement d'un modèle) ;
   - réserver l'accès aux personnes de l'atelier qui en ont besoin, tenues à la confidentialité ;
   - appliquer les mesures de sécurité de l'article 32 : chiffrement en transit, stockage dans l'UE,
     liens d'accès secrets de 32 caractères, comptes nominatifs pour l'atelier, journal des actions ;
     [liste à compléter et à vérifier avant signature] ;
   - aider le Client à répondre aux demandes des personnes (accès, effacement…) et, le cas échéant,
     pour une analyse d'impact ou une consultation de l'autorité ;
   - notifier au Client toute violation de données dans les meilleurs délais après en avoir pris
     connaissance, [délai contractuel à fixer, à faire relire], avec les informations de l'art. 33.3 ;
   - mettre à la disposition du Client les informations nécessaires pour démontrer le respect du
     présent accord, et permettre des audits dans des conditions raisonnables.
8. **Sous-traitants ultérieurs.** Le Client autorise ceux de la liste jointe (Supabase, Cloudflare,
   Vercel, Brevo, Geoapify, Google, [imprimeur]). Bellajour informe le Client de tout ajout ou
   remplacement, qui peut s'y opposer [délai à fixer] ; Bellajour leur impose les mêmes obligations.
   Transferts hors UE : encadrés par la décision d'adéquation ou les clauses contractuelles types
   (voir la politique de confidentialité, §9).
9. **Fin du traitement.** Les photos, leurs métadonnées et les fichiers de travail sont supprimés
   **[30] jours après la livraison** ; une photo supprimée par le Client ou par la personne qui l'a
   envoyée l'est 30 jours après ; le PDF du magazine est conservé [durée, Q3] pour une réimpression,
   sauf demande contraire du Client ; restent les pièces que la loi oblige à garder (devis, factures).
   À la demande du Client avant cette date, Bellajour lui remet les photos reçues [format à fixer].
10. **Droit applicable.** Droit portugais ; [juridiction à fixer avec la relecture].

---

## 7. Ce qui n'est pas vérifié, ou reste à faire

- La juridiction du coffre R2 **en production** (seule l'adresse du `.env.local` local a été lue) ;
  le versioning du bucket ; les sauvegardes Supabase (dépend du plan, PRD §12.2) ; ce que Brevo et
  Vercel gardent de leurs journaux et combien de temps.
- La localisation de Geoapify et le cadre du compte Google (Workspace ou non).
- L'imprimeur des éditions collectives.
- Toutes les qualifications juridiques de ce fichier, et les durées marquées « à fixer ».
- `photos_supprimees_le` est lu par les écrans depuis le 20/10 au soir (§4 bis), sauf les pièces
  jointes des messages.
- Les trois décisions du 20/10 (e-mail du participant, album du lien, corbeille) ne sont pas
  codées : la politique ne doit les annoncer qu'une fois en ligne.
