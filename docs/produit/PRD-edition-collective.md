# PRD — L'Édition collective (espace pro B2B)

> À poser dans le dépôt : `docs/produit/PRD-edition-collective.md`.
> Maquettes de référence : `docs/produit/collectif/maquettes/*.dc.html` (HTML à styles en ligne,
> lisibles tels quels ; le rendu exact est sur la toile des fondateurs).
> Rédigé le 12/10/2026 à partir de trois séances de conception avec Mathias.
> **Ce document décrit le QUOI et le POURQUOI. Le COMMENT se décide en Plan Mode, après lecture
> du code existant.** Rien ici ne lève un interdit du `CLAUDE.md` racine.

---

## 0. À lire avant tout

### 0.1 Ce qu'on construit

Un **second produit dans le même site** : l'édition collective. Une entreprise ou une école
signe une proposition commerciale pour un ou plusieurs magazines d'événement (séminaire,
soirée, voyage). Après signature, l'atelier ouvre une **édition** ; le client reçoit un lien
vers un **espace** qui ressemble à un logiciel : il partage un lien de dépôt aux participants,
choisit un style par magazine, envoie quelques contenus, puis relit le bon à tirer (BAT) page
par page avec des notes, choisit sa couverture et suit la livraison.

### 0.2 Ce qu'on NE touche PAS

Le B2C (`numeros`, `/composer`, `/numero/<token>`, `/compte`, la machine M0→M10, Stripe,
Cloudprinter, la rétention) **continue de fonctionner exactement comme avant**. Règle d'or :

- **Tables séparées** (`collectif_*`), **lib séparée** (`src/lib/collectif/`), **routes
  séparées** (`/api/collectif/*`, `/api/admin/collectif/*`), **pages séparées**
  (`/edition/…`, `/depot/…`, `/admin/collectif/…`).
- On **réutilise** les modules purs et les briques à effets existants (R2, pdf.js, empreinte,
  métadonnées, `suivi.ts`, `sendBrevoEmail`, le patron du verrou `mails_envoyes`, le journal)
  **sans changer leur comportement B2C**. Si une brique doit être généralisée, on la
  généralise par ajout d'un paramètre optionnel dont la valeur par défaut reproduit le
  comportement actuel, et `scripts/verif-atelier.ts` doit rester vert.
- Avant de toucher `/composer`, `/numero` ou `/admin/atelier` : lire
  `docs/reference/PARCOURS-INVARIANTS.md`.

### 0.3 Les interdits du dépôt s'appliquent tous

Branche dédiée (jamais `main`), jamais `git add -A`, jamais de mail réel, jamais de migration
appliquée (Mathias les applique), jamais de suppression (on archive), **jamais un chiffre
inventé** : tout ce qui manque est écrit `[À FIXER]` dans l'écran et listé en §12.

### 0.4 Le but de cette première livraison

Mathias veut **ouvrir de vraies éditions de test et tout utiliser de bout en bout** pour voir
ce qu'il faut améliorer. Il ajoutera les styles réels au fur et à mesure. Donc :

- **Phases 0 à 6 : fonctionnelles** (§11), derrière un interrupteur `COLLECTIF_OUVERT`.
- **Phase 7 : documentée, pas codée** (mails, relances automatiques, temps réel, imports par
  lien, édition de démonstration…). Le code des phases 0 à 6 doit **prévoir les points
  d'accroche** (codes de mails, colonnes, journal) pour que la phase 7 n'oblige à rien casser.

### 0.5 Maquettes et PRD : en cas d'écart, le PRD fait foi

Les maquettes montrent l'intention visuelle. Les `{{ … }}`, `<sc-for>`, `<sc-if>` et la classe
`DCLogic` sont l'outil de maquettage : **ne pas les reproduire**, construire en React / Next.
Les textes et données des maquettes sont fictifs (« Maison Aubier », « Marion Lefèvre », dates,
montants) : **ne jamais les reprendre dans le code**. Écarts connus, à traiter comme suit :

| Maquette | Ce qu'elle montre | Ce qu'on construit |
|---|---|---|
| `Livraison.dc.html` | « Derniers passages » mis à jour à chaque scan | **Pas de suivi en direct** (aucune API transporteur) : transporteur + numéro + bouton vers le site du transporteur (`suivi.ts`), étapes posées à la main par l'atelier. Le flux de passages est phase 7. |
| `RendezVous.dc.html` | Grille de créneaux maison | **Lien vers la page de rendez-vous Google** de la fiche (`rdv_url`), ouverte dans un nouvel onglet. Pas de moteur de créneaux. |
| `RendezVous.dc.html` | « Accepter la proposition » | Bouton qui journalise l'acceptation + message à l'atelier. Aucun paiement, aucun montant inventé : le document vient de l'atelier. |
| `Dossier.dc.html` | « L'atelier vous répond ici et par mail » | Phases 2 à 6 : « L'atelier vous répond ici ». Le mail est phase 7. |
| `Participant.dc.html` | « Si vous la fermez, l'envoi reprend où il s'était arrêté » | Faux sur iPhone. Écrire : « Gardez cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées. » |
| `Participant.dc.html` | « offert à chaque participant », case de consentement « Lire les conditions » | Phrase d'invitation = **texte libre réglé par l'atelier** dans la fiche. Le texte du consentement et des conditions est un **texte légal** : `[À FIXER]` + avis de Mathias, jamais rédigé d'office. |
| `Atelier.dc.html` | « relance prévue la veille » | Pas de relance automatique avant la phase 7 : ne pas l'afficher. |
| `Espace.dc.html` | Bouton « Maquette seulement · voir l'écran » | N'existe pas dans le produit. |
| `Couverture.dc.html` | Page couverture séparée | Archive : la couverture vit dans le panneau du BAT. |

### 0.6 Briques à réutiliser qui ne sont pas encore génériques

- `enrichissement.ts` écrit dans la table `photos` (en dur). Pour `collectif_photos`, le
  généraliser par un paramètre (table, colonnes) dont la valeur par défaut garde le B2C intact,
  ou en extraire le cœur pur. À trancher dans le plan.
- `/api/atelier/photos/presign` valide un token de `numeros` et plafonne à 100 : le B2B a ses
  propres routes, il n'y touche pas.

---

## 1. Vocabulaire (à utiliser tel quel dans le code et les écrans)

| Terme | Sens |
|---|---|
| **Édition** | Le projet d'un client B2B (`collectif_editions`). Contient 1 à N magazines. |
| **Magazine** | Un livre de l'édition (« Le séminaire », « La soirée »). Chacun a son brief, ses tours de BAT, sa couverture. |
| **Responsable** | LA personne du client qui note et valide le BAT. Une seule par édition, désignée par e-mail à la création. Elle reçoit le lien organisateur. |
| **Équipe** | Collègues du client : lien en **lecture seule** (voient tout, ne notent ni ne valident). |
| **Participant** | Toute personne de l'événement. Lien de dépôt uniquement, sans compte, plafonné. |
| **Provenance** | D'où vient un lot de photos : `organisateur`, `photographe`, `participant`, `autre` (+ libellé libre). |
| **Style** | Un univers créé par les fondateurs : palette(s), typographies, couvertures, cinq doubles pages types. |
| **Brief** | Pour UN magazine : un style + une palette + 1 à 5 doubles pages préférées + la part de texte + 0 à N couvertures aimées (de n'importe quel style). |
| **Tour** | Une version du BAT d'un magazine (un PDF déposé par l'atelier). Figé à sa publication. |
| **Note** | Une remarque posée sur une page d'un tour, à une position, avec un type. |
| **Proposition de couverture** | Une des couvertures (nombre réglable) livrées avec le tour 1, chacune avec sa 2e et sa 3e de couverture. |

**Règle produit à ne jamais violer** (décision Mathias du 08/10) : *dans un magazine, tout
l'intérieur suit le style choisi ; seule la couverture peut venir d'un autre style.* Elle est
écrite à l'écran sur le mur des styles, sur la page d'un style et dans le panneau des couvertures.

---

## 2. Les rôles et ce qu'ils peuvent faire

| Action | Atelier | Responsable | Équipe | Participant |
|---|---|---|---|---|
| Créer / régler une édition | ✔ | | | |
| Gérer les styles du mur | ✔ | | | |
| Voir l'espace client | ✔ (aperçu) | ✔ | ✔ (lecture) | |
| Régler le plafond de photos par participant (≤ plafond atelier) | ✔ | ✔ | | |
| Déposer des photos | ✔ | ✔ sans plafond | | ✔ plafonné |
| Présélectionner / signaler des photos | ✔ | ✔ | | |
| Choisir style et brief, valider le brief | | ✔ | | |
| Envoyer les contenus (logo, programme, mot du dirigeant, liste) | | ✔ | | |
| Déposer un tour de BAT, répondre aux notes | ✔ | | | |
| Poser, résoudre, envoyer des notes ; choisir la couverture ; valider le BAT | | ✔ | | |
| Écrire à l'atelier | ✔ | ✔ | | |
| Saisir transporteur et numéro de suivi | ✔ | | | |

Identité = **le token de l'URL** (comme `numeros.token`, 32 caractères, `token.ts`). Trois
tokens par édition : `token_responsable`, `token_equipe`, `token_depot`. Le compte Supabase
Auth n'est PAS utilisé pour le B2B à ce stade.

---

## 3. Le parcours, de bout en bout

1. **Signature** de la proposition commerciale (hors outil).
2. **L'atelier ouvre l'édition** (`/admin/collectif/nouvelle`) : client, événement, magazines,
   réglages de collecte, de BAT, de styles, contenus demandés, e-mail de la responsable, lien
   de rendez-vous. → trois liens générés. **Aucun mail ne part** : l'atelier copie le lien et
   l'envoie lui-même (le mail E1 viendra en phase 7, toujours déclenché à la main).
3. **Phase « Préparation »** (jusqu'à la clôture de la collecte). La responsable voit un
   tableau de bord à deux encarts :
   - **Le style** → mur des styles → page d'un style → brief par magazine → validation.
   - **Les photos** → lien participants + QR + curseur de plafond ; dépôt par elle-même avec
     provenance ; grille ; présélection **facultative**.
   - Une ligne « À envoyer à l'atelier » (contenus cochés à la création).
4. **Clôture** (date réglée) : le lien participants se ferme tout seul. L'atelier compose
   (hors outil, Affinity), en s'appuyant sur les briefs et les photos.
5. **Tour 1** : l'atelier dépose le PDF du magazine + les propositions de couverture (avec 2e
   et 3e de couverture) → l'outil découpe le PDF en images de pages → publication. Le menu
   « Bon à tirer » se déverrouille côté client.
6. **Relecture** : la responsable feuillette, pose des notes typées, choisit sa couverture
   dans un panneau, envoie ses notes. Elle peut demander un appel (rendez-vous Google) ou une
   modification (→ appel puis proposition complémentaire).
7. **Tours suivants** : l'atelier dépose un nouveau PDF, répond aux notes (résolue + réponse).
   Le client voit l'avant / après et l'historique des tours, qui restent consultables.
8. **Validation du BAT** par la responsable : définitive, confirmée en deux gestes.
9. **Impression et livraison** : l'atelier saisit transporteur + numéro (pas d'API imprimeur
   aujourd'hui, Cloudprinter est en cours de remplacement) ; le client suit le colis.

### 3.1 Les états d'une édition (machine pure, `src/lib/collectif/etats.ts`)

`preparation` → `composition` → `bat` → `bat_valide` → `impression` → `expediee` → `livree`
(+ `archivee` comme marqueur, pas comme état, sur le patron de `numeros.archive_le`).

- `preparation → composition` : à la date de clôture (calculée à la lecture, pas de cron
  nécessaire) OU par geste atelier « Clore maintenant ».
- `composition → bat` : publication du premier tour d'au moins un magazine.
- `bat → bat_valide` : tous les magazines validés.
- Les gestes suivants sont atelier.

Comme `transitions.ts` côté B2C : **une table pure des gestes** (de, vers, qui, patch), testée
dans `scripts/verif-collectif.ts`. L'état d'un **magazine** (brief à faire / brief validé /
tour n publié / validé) est dérivé de ses lignes, pas stocké en double.

### 3.2 Le menu verrouillé (demande explicite de Mathias)

Le menu de gauche de l'espace client affiche toujours les mêmes entrées. Une étape pas encore
ouverte est **grisée, avec un cadenas, non cliquable**, et dit pourquoi au survol et au tap
(« Disponible à la réception du premier bon à tirer », « Disponible après la validation du bon
à tirer »). Règle pure `verrousPour(etat)` dans `src/lib/collectif/`, lue par le menu ET par la
page elle-même (une URL tapée à la main sur une étape verrouillée affiche le même message, pas
une erreur).

---

## 4. L'espace client — un logiciel, pas un site

### 4.1 Principes (non négociables, demandés par Mathias)

- **Coquille persistante** : `src/app/edition/[token]/layout.tsx` porte le menu de gauche ;
  chaque section est une route enfant ; navigation par `<Link>` (le site le fait déjà depuis
  le 09/09) : **aucun rechargement de document**. `loading.tsx` en forme d'écran (patron admin).
- **Les sous-actions s'ouvrent sur place** : couvertures, nouvelle note, dépôt de photos,
  envoi d'un contenu = panneaux ou fenêtres dans la page, jamais une autre page.
- **Pas de flèche « ← retour »** sauf vrai retour hiérarchique (un style → le mur, en fil
  d'Ariane « Le style / Riviera »).
- **Monde SOMBRE** : scope `.bj-atelier`, tokens de `(atelier)/theme.css`. Couleurs voulues par
  Mathias pour cet espace : **noir, blanc, orange** (`--c-accent #d68a63`) en touche et en
  transparence ; pas de gris « sale », pas d'autre couleur. Cormorant Garamond + DM Sans.
  Toutes les règles de `src/app/CLAUDE.md` valent (zéro `next/image`, pas de `dvh`, CSS par
  section, scope racine dédié, par ex. `.ec-espace`).
- **Mobile** : l'espace responsable doit être utilisable sur téléphone (menu en tiroir) ; le
  lien participant est **d'abord mobile**.

### 4.2 Les sections (maquette → route)

| Menu | Route | Maquette | Contenu |
|---|---|---|---|
| Tableau de bord | `/edition/[t]` | `Espace.dc.html` | Titre, échéance unique « Tout avant le … », barre d'étapes. **Deux encarts** : Style (état vide : aperçu du mur + « Ouvrir le mur des styles » ; en cours : choix par magazine) et Photos (état vide : « Aucune photo pour l'instant » + lien + QR + curseur ; en cours : compteurs, vignettes, « Voir les photos »). Ligne « À envoyer à l'atelier » (puces cochées). Phrase « Ensuite ». |
| Style | `/edition/[t]/style` | `Styles.dc.html` | Mur façon Pinterest, filtres (Tout, Couvertures, Typographies, Palettes, Doubles pages), bascule de magazine, panneau « Brief du magazine N » à droite, validation, « Passer au magazine 2 → ». Tag translucide « Sélection du magazine 1 » (info-bulle) sur magazine 2. « Reprendre le style du magazine 1 ». |
| (un style) | `/edition/[t]/style/[slug]` | `StyleDetail.dc.html` | Fil d'Ariane, hero + couverture recolorée en direct, **1 La palette** (gauche, bandes) / **2 Le texte** (droite, décalé : typos + « Quelle place pour le texte ? »), **3 Vos plus belles doubles pages** (1 à 5 parmi 5), couvertures de ce style (« J'aime », plafond réglable), barre fixe « Choisir Riviera pour le magazine N ». |
| Photos | `/edition/[t]/photos` | `Collecte.dc.html` | Compteurs, filtres (Toutes, Par jour, **Par provenance**, Doublons, Ma présélection), grille, présélection facultative (compteur sur le plafond de la fiche), « Laisser l'atelier choisir », qui a déposé, signaler une photo. Panneau **Déposer des photos** (§5.2). |
| Bon à tirer | `/edition/[t]/bat` | `BAT.dc.html` | §6. |
| Livraison | `/edition/[t]/livraison` | `Livraison.dc.html` | Étapes, transporteur, lien de suivi (`suivi.ts`), adresse. |
| Votre dossier | `/edition/[t]/dossier` | `Dossier.dc.html` | Ce qui est prévu au devis (lu dans la fiche), documents (devis signé, factures, CGV, accord sur les données), **messagerie** (§7). |
| Parler à l'atelier | `/edition/[t]/atelier` | `RendezVous.dc.html` | Prendre rendez-vous (lien Google de la fiche), demander une modification (motifs + texte → message + événement ; la proposition complémentaire est un document posé par l'atelier). |

La maquette `Couverture.dc.html` est une **archive** : la couverture vit désormais dans le
panneau du BAT. Le bouton « Aperçu de la maquette » du tableau de bord **n'existe pas** dans le
produit (c'était un sélecteur d'état pour la démonstration).

---

## 5. La collecte des photos

### 5.1 Le lien participant (`/depot/[token_depot]`, maquette `Participant.dc.html`)

- Mobile d'abord. Prénom (facultatif) → choisir des photos → envoi → « Merci, N photos reçues ».
- **Plafond par participant** = la valeur du curseur de la responsable (≤ plafond atelier).
  Sans compte, le plafond est tenu **par appareil** (identifiant aléatoire en cookie
  `httpOnly`) + prénom. C'est un frein honnête, pas une garantie : l'écran ne prétend pas
  le contraire et le plafond total de l'édition, lui, est tenu côté serveur.
- Fermé après la clôture (message clair, pas une erreur).
- Pas de mail, pas d'adresse demandée.

### 5.2 Le dépôt par la responsable (panneau dans Photos)

1. « D'où viennent ces photos ? » : Mes photos / Le photographe / Un participant (nom) /
   Autre source (libellé). → chaque photo porte `provenance` + `deposant`.
2. Glisser des photos **ou un dossier entier** ; boutons « Choisir des photos » / « Choisir un
   dossier » (`webkitdirectory`). JPEG, HEIC, PNG. **Sans plafond pour elle.**
3. File d'attente par lot avec progression ; on peut naviguer dans l'espace pendant l'envoi
   (le moteur vit dans la coquille, pas dans la page).
4. **Lien de dépôt sans plafond par provenance** (ex. photographe) :
   `/depot/[token_depot]?p=<cle>` où `<cle>` est une provenance nommée créée par la
   responsable ou l'atelier (table `collectif_provenances`).
5. Doublons écartés par empreinte (pHash existant, `empreinte.ts`) : reprendre le même dossier
   après une coupure ne crée pas de doublon.

### 5.3 Le moteur d'envoi

- **Diagnostiquer d'abord** `(atelier)/composer/depot/moteur.ts`, `paliers.ts`,
  `/api/atelier/photos/presign|complete`. Le plafond B2C (`MAX_PHOTOS = 100`) **ne change pas**.
- Cible : envoi direct navigateur → R2 par URL signées, 3 à 4 fichiers en parallèle, nouvel
  essai automatique, confirmation par lot. Si le moteur B2C est extractible proprement
  (paramètres : routes, plafond, métadonnées de lot), l'extraire dans un module partagé ;
  sinon écrire `src/lib/collectif/depot/` en s'en inspirant. **Le choix se justifie dans le
  plan.**
- **Volumes visés** : 1 000 à 2 000 photos par édition. Les écrans doivent rester fluides avec
  2 000 vignettes (grille virtualisée ou pagination).
- **Limites à dire honnêtement** : pas d'envoi page fermée (iOS surtout) ; HEIC sans vignette
  aujourd'hui (voir T-123 et la lecture `sharp`) → la vignette HEIC est une tâche à part
  entière, à chiffrer dans le plan.
- Stockage : préfixe R2 `collectif/<edition_id>/photos/…`.
- Lecture des métadonnées : réutiliser `enrichissement.ts` (date, lieu, empreinte) en
  tâche de fond, comme le B2C.

### 5.4 La présélection

Réglage de la fiche : **photos accessibles** et **présélection remise** (peuvent être égaux).
Si présélection < total : le client PEUT présélectionner, jamais obligé (« Laisser l'atelier
choisir »). Signaler une photo (« à ne pas publier ») est toujours possible et visible côté
atelier.

---

## 6. Le bon à tirer

### 6.1 Côté atelier : déposer un tour (`/admin/collectif/[id]` → magazine → « Nouveau tour »)

1. Déposer le PDF exporté d'Affinity. **Dans le navigateur de l'atelier** (patron de
   `rendreBords.ts`, pdf.js déjà dans `public/pdfjs/`) :
   - rendu de chaque page en image (largeur cible à fixer dans le plan, WebP ou JPEG) ;
   - envoi des images sur R2 (`collectif/<id>/tours/<n>/pages/<i>.webp`) ;
   - **appariement avec le tour précédent par ressemblance**, pas par numéro (empreinte
     perceptuelle par page) : une page sans équivalent = « nouvelle page », une page disparue
     = « page retirée » ;
   - **zones modifiées** : différence de pixels entre pages appariées → rectangles
     englobants (en %), stockés avec la page.
   - Progression affichée « page i sur n ».
2. Tour 1 seulement : déposer **les propositions de couverture** (nombre réglé dans la fiche,
   3 par défaut), chacune = 1re + 2e + 3e de couverture (images).
3. Échéance de retour (date), puis **Publier** (en deux gestes, comme l'admin B2C).
4. Un tour publié est **figé** : un nouveau PDF crée un nouveau tour, il ne remplace jamais
   l'ancien. Le PDF source reste au coffre, **jamais servi au client**.
5. ⚠️ **Premier test à faire** : un vrai export Affinity (polices, transparences, fonds
   perdus) rendu par pdf.js. Si le rendu diverge, le plan doit proposer l'alternative (export
   images depuis Affinity, ou rendu serveur).

### 6.2 Côté client : relire (`/edition/[t]/bat`)

- Sélecteur de magazine (si N > 1), onglets de tours (« Tour 1 », « Tour 2 · en cours »),
  bascule **Avant / Après** (zones modifiées entourées), navigation double page par double
  page, plein écran, bande de vignettes.
- **La couverture** est la première vignette : un clic ouvre le **panneau des couvertures**
  par-dessus la page (pas de changement d'URL) : propositions en mockup 3D (légère rotation,
  reflet, ombre au sol, pas de traits sur la tranche), clic = choix, « Sans préférence », note
  sur la couverture ; dessous, **2e et 3e de couverture** de la proposition choisie, en
  magazine ouvert. Changement d'avis possible jusqu'à la validation.
- **Poser une note** : clic sur la page → fenêtre à cet endroit, quatre types :
  - *Corriger un texte* : texte touché (sélection si possible, sinon saisi) + « Remplacer par » ;
  - *Changer une photo* : choisir parmi les photos de l'édition, ou décrire ;
  - *Une idée, une demande* : texte libre (« un texte qui parle de… ») ;
  - *Retirer un élément* : raison facultative.
  Les types sont une **liste extensible** (constante pure), pas un `enum` en base.
- La note est **enregistrée tout de suite** (brouillon), visible en épingle numérotée ;
  « Envoyer mes notes à l'atelier » les transmet en lot. Filtres Toutes / À traiter / Résolues.
  La responsable peut rouvrir une note résolue.
- **Note générale** (sans position).
- **Valider le bon à tirer** : deux gestes, texte « La validation est définitive. Elle confirme
  le tirage de N exemplaires et lance l'impression. » (N lu dans la fiche).
- **Équipe (lecture)** : voit tout, aucun bouton d'écriture.
- Tours archivés : consultables, non annotables (bandeau).

### 6.3 Fluidité attendue

Les images de pages se préchargent (page courante ± 2) ; poser une note répond en moins de
100 ms à l'écran (mise à jour optimiste, écriture en arrière-plan, reprise si échec avec
message clair). Aucun rechargement de document entre les pages.

---

## 7. La messagerie client ↔ atelier

- Table `collectif_messages`. Côté client : dans « Votre dossier » ; côté atelier : sur la
  fiche + compteur de non-lus dans la liste `/admin/collectif`.
- **Instantanéité** (exigence Mathias) : phase 1 = **interrogation toutes les 3 à 4 s quand
  l'onglet est visible**, rien quand il est caché, rattrapage au retour (patron
  `Rafraichissement.tsx`). Ressenti quasi instantané, sans client Supabase dans le
  navigateur (règle du dépôt). Le passage à Supabase Realtime est en phase 7 et demande
  l'avis de Mathias (il ouvre un client navigateur).
- Mail seulement si le destinataire n'est pas en ligne : **phase 7**.

---

## 8. Le back-office atelier

Monde CRÈME (comme `/admin/atelier`), auth existante (`bj_admin`, comptes nominatifs, les
gestes sont attribués). Toutes les routes d'écriture sous `/api/admin/collectif/*`.

| Écran | Maquette | Contenu |
|---|---|---|
| `/admin/collectif` | `Atelier.dc.html` | Liste des éditions : client, magazines, état, prochaine étape et camp (« À nous » / « Au client »), échéance, non-lus. |
| `/admin/collectif/nouvelle` | `Creation.dc.html` | Formulaire de création (tous les réglages de §9.1), case « Édition de démonstration » (phase 7 : visible mais désactivée avec explication). Résultat : trois liens à copier. Aucun mail. |
| `/admin/collectif/[id]` | `Fiche.dc.html` | Tout se règle sans code : réglages, liens (régénérer un token), collecte (compteurs, téléchargement du lot par provenance — réutiliser `lot.ts`), briefs reçus, contenus reçus, tours (dépôt PDF, couvertures, publication), notes reçues (répondre, résoudre), choix de couverture, messages, documents (déposer devis, factures, proposition complémentaire), livraison (transporteur + numéro), journal. |
| `/admin/collectif/styles` | — | **Éditeur des styles** (prioritaire : Mathias les ajoute au fil de l'eau). Créer / modifier / publier / dépublier un style : nom, slug, description, segment (entreprise, école, tous), palettes (nom + 4 couleurs), typographies (titres, texte, échantillon), couvertures (images), **cinq doubles pages types** (aérée, équilibrée, dense, récit, audacieuse : image + légende), ordre sur le mur. Images vers R2 `collectif/styles/<slug>/…`. |

---

## 9. Les données (proposition — à confirmer en Plan Mode)

Fichier de migration unique : `supabase/migrations/2026MMJJ_collectif.sql`. **Écrit, jamais
appliqué** : Mathias l'applique. Comme les tables sont neuves, l'absence de migration se gère
par un **503 explicite « migration collectif absente »** sur toutes les pages et routes
`collectif` (pas de repli silencieux). RLS activée (patron du dépôt), service key côté serveur.

### 9.1 `collectif_editions`
`id` uuid · `token_responsable` / `token_equipe` / `token_depot` (uniques) · `organisation` ·
`evenement` · `dates_texte` · `registre` (`entreprise_vous` | `ecole_tu`) · `etat` + `etat_maj_le` ·
`cloture_le` · `plafond_participant_atelier` · `plafond_participant_client` (≤ précédent) ·
`plafond_total` · `preselection_max` · `pagination_prevue` (indicative) · `tirage` ·
`tours_inclus` · `nb_propositions_couverture` · `couvertures_aimees_max` · `styles_segment` ·
`contenus_demandes` (jsonb : logo, programme, mot, liste, rubrique) · `responsable_email` ·
`responsable_nom` · `rdv_url` · `livraison` (jsonb : adresse, transporteur, code, expediee_le,
livree_le) · `demo` (bool, défaut false) · `archive_le` · `photos_supprimees_le` ·
`created_at` · `cree_par`.

### 9.2 Les autres tables
- `collectif_magazines` : `edition_id`, `rang`, `nom`, brief (`style_id`, `palette_cle`,
  `doubles` text[], `texte`, `couvertures_aimees` jsonb), `brief_valide_le`,
  `couverture_choisie` (id de proposition ou `sans`), `couverture_note`, `bat_valide_le`,
  `bat_valide_par`.
- `collectif_styles` : `slug` unique, `nom`, `description`, `segment`, `palettes` jsonb,
  `typos` jsonb, `couvertures` jsonb, `doubles` jsonb, `publie`, `ordre`.
- `collectif_provenances` : `edition_id`, `cle`, `type`, `libelle`, `sans_plafond`.
- `collectif_photos` : `edition_id`, `r2_key` unique, `vignette_key`, `provenance_id` /
  `provenance_type`, `deposant`, `appareil_id`, `empreinte` + colonnes de métadonnées sur le
  modèle de `photos`, `preselection` bool, `signalee` + `signalement_motif`,
  `confirmee_le`, `created_at`.
- `collectif_contenus` : `edition_id`, `type`, `r2_key` ou `reponses` jsonb (mot du dirigeant
  par questionnaire), `recu_le`.
- `collectif_tours` : `magazine_id`, `numero`, `pdf_key`, `nb_pages`, `pages` jsonb
  (`index`, `image_key`, `empreinte`, `apparie_a`, `zones`), `echeance_retours`, `publie_le`,
  `publie_par`.
- `collectif_couvertures` : `tour_id`, `rang`, `image_key`, `interieur2_key`,
  `interieur3_key`, `legende`.
- `collectif_notes` : `tour_id`, `page_index` (null = note générale), `x_pct`, `y_pct`,
  `type`, `contenu` jsonb, `envoyee_le`, `resolue_le`, `reponse_atelier`, `created_at`.
- `collectif_messages` : `edition_id`, `auteur` (`client` | `atelier`), `qui`, `texte`,
  `created_at`, `lu_client_le`, `lu_atelier_le`.
- `collectif_documents` : `edition_id`, `type`, `libelle`, `r2_key`, `statut_texte`,
  `created_at`.
- `collectif_evenements` : journal append-only (`edition_id`, `type`, `payload`, `qui`,
  `created_at`). **Toute écriture est journalisée** (règle du dépôt).
- `collectif_mails` : verrou anti-doublon unique (`edition_id`, `code`) — créé dès la phase 0,
  utilisé en phase 7.

---

## 10. Sécurité et fiabilité (priorité n° 1 de Mathias : « la fiabilité avant tout »)

- Tokens validés par forme (`tokenForme.ts`) avant toute requête ; réponse identique pour un
  token inconnu et un token d'une édition archivée (pas d'annuaire).
- Le token `equipe` ne peut **rien** écrire : garde dans chaque route d'écriture, testée.
- Le token `depot` ne voit **rien** d'autre que son formulaire.
- Les écritures admin vont sous `/api/admin/collectif/*` (protégé par le middleware ET revérifié
  dans la route, règle du dépôt).
- Validation d'entrée à la main, corps `unknown` inspectés (style du dépôt, pas de zod).
- Un PDF déposé ne peut jamais écraser un tour publié (contrainte en base + garde serveur).
- Aucune action métier n'échoue parce qu'un mail échoue (règle `sendBrevoEmail`).
- Chaque route qui écrit rend un vrai code d'erreur ; jamais de 200 sur une écriture ratée.
- `scripts/verif-collectif.ts` : machine d'états, verrous du menu, plafonds (participant ≤
  atelier, total), appariement de pages, calcul des zones sur cas synthétiques, droits par
  token. Lancé à chaque livraison avec `tsc`, `lint`, `build`, `verif-atelier.ts`.

---

## 11. Le plan de livraison

**Une phase = une branche = une PR**, dans l'ordre. Chaque phase se termine par : vérifications
du dépôt, captures d'écran (desktop + 375 px), liste de recette pour Mathias (URL + quoi
regarder), mise à jour de `docs/reference/ETAT-PRODUCTION.md`.

**Phase 0 — Socle**
Interrupteur `COLLECTIF_OUVERT` (sans lui : 404 sur `/edition`, `/depot`, et l'entrée de
menu admin absente). Migration écrite. `src/lib/collectif/` : types, états, gestes, verrous,
plafonds, droits (purs). `scripts/verif-collectif.ts`. `src/lib/collectif/CLAUDE.md` (les
règles de ce dossier). Tickets ouverts dans `docs/backlog/` (un par phase, à partir de T-139).
*Recette* : le site B2C est identique ; les routes collectif répondent 404 sans l'interrupteur,
503 « migration absente » avec l'interrupteur sans migration.

**Phase 1 — Ouvrir une édition et gérer les styles (atelier)**
Liste, création, fiche (réglages + liens + journal), éditeur de styles complet avec images.
*Recette* : Mathias crée un style avec ses images, crée une édition à deux magazines, copie
les trois liens.

**Phase 2 — La coquille client + tableau de bord + dossier + messagerie**
Layout à menu persistant, verrous, tableau de bord (état vide ET en cours), « Votre dossier »
(devis et documents déposés par l'atelier), messagerie dans les deux sens (interrogation 3–4 s),
lien équipe en lecture seule.
*Recette* : ouvrir le lien responsable sur ordinateur et téléphone, échanger des messages
avec l'admin dans deux fenêtres, vérifier que le lien équipe ne peut rien écrire.

**Phase 3 — La collecte**
Lien participant mobile, plafonds, clôture, panneau de dépôt responsable (provenances,
dossier entier, file d'attente), lien sans plafond par provenance, grille 2 000 photos,
filtres, doublons, présélection facultative, signalement ; côté atelier : compteurs et
téléchargement du lot par provenance.
*Recette* : 3 téléphones déposent, la responsable dépose un dossier de 300 photos, coupe le
réseau, reprend ; aucun doublon ; le plafond tient ; après la clôture, le lien se ferme.

**Phase 4 — Le style**
Mur (filtres, magazines, tags translucides, brief à droite avec liens qui mènent au bon
endroit), page d'un style (palette en direct, texte et typos, 1 à 5 doubles pages,
couvertures aimées), brief par magazine, validation, « Passer au magazine 2 », la règle
intérieur / couverture écrite à l'écran ; côté atelier : brief lisible sur la fiche.
*Recette* : brief complet pour deux magazines, dont une couverture aimée d'un autre style.

**Phase 5 — Le bon à tirer**
Dépôt d'un tour (découpe pdf.js, images R2, appariement, zones), propositions de couverture
avec 2e/3e, publication, lecteur client (tours, avant/après, vignettes, plein écran),
panneau des couvertures, notes typées (brouillon, envoi, résolution, réponse atelier, filtres),
note générale, validation en deux gestes, lecture seule pour l'équipe, tour archivé figé.
*Recette* : tour 1 avec un vrai PDF Affinity (24 à 40 pages), 5 notes de 4 types, choix de
couverture, tour 2 avec une page ajoutée → l'avant/après apparie correctement et signale la
nouvelle page ; validation.

**Phase 6 — Parler à l'atelier et livraison**
Lien de rendez-vous Google (réglé dans la fiche), « Demander une modification » (motifs +
texte → message + événement + document « proposition complémentaire » posé par l'atelier),
saisie transporteur + numéro (`suivi.ts`), page livraison.
*Recette* : demande de modification visible côté atelier, numéro de suivi qui ouvre le bon
lien transporteur.

**Phase 7 — Plus tard (documenté, pas codé maintenant)**
Prévoir les accroches, ne rien envoyer :
- **Mails** (codes réservés, verrou `collectif_mails`, interrupteur `ATELIER_MAILS_COUPES`
  respecté, textes versionnés dans `scripts/mails-collectif.mjs`, jamais d'envoi sans accord
  de Mathias) :

  | Code | Déclencheur | Mail |
  |---|---|---|
  | E1 | Clic atelier « Envoyer le lien » | Ouverture de l'espace (manuel) |
  | E2 | J-7 avant clôture s'il reste à faire | Relance groupée (ce qui manque) |
  | E3 | J-2 avant clôture s'il reste à faire | Dernière relance |
  | E4 | Clôture | Récap + « l'atelier compose » |
  | E5 | Tour 1 publié | BAT + couvertures + échéance |
  | E6 | J-2 avant échéance du BAT sans notes ni validation | Relance BAT |
  | E7 | Nouveau tour | Ce qui a changé |
  | E8 | Message atelier, client hors ligne | Regroupé, au plus un par tranche de [À FIXER] min |
  | E9 | BAT validé | Confirmation |
  | E10 | Proposition complémentaire | À accepter (manuel) |
  | E11 | Expédition | Transporteur + suivi |
  | E12 | Livraison | Confirmation + demande de retour (avis de Mathias) |
  | A1–A6 | Atelier | Nouveau message, notes envoyées, BAT validé, couverture choisie, brief validé, erreur d'envoi ; + résumé quotidien |

  Participants : aucun mail ; un **message type à copier** pour l'organisateur (WhatsApp,
  Slack…) est, lui, en phase 3.
- Relances automatiques par la relève quotidienne (`vercel.json`) ou le workflow horaire.
- Supabase Realtime pour la messagerie (avis requis).
- Import par lien (Google Drive, WeTransfer, Dropbox).
- **Édition de démonstration** créée depuis « Ouvrir une édition » (photos et notes fictives,
  bandeau, aucun mail, hors chiffres).
- Facturation B2B (InvoiceXpress, D22 : avis requis), paiement du solde.
- Commande imprimeur par API (selon l'imprimeur retenu).
- Suppression des photos après [DÉLAI À FIXER] (script, sur le modèle de
  `anonymiser-dossiers.ts`).
- Page publique « Édition collective » (maquette `Main.dc.html`, page « Plus tard »).
- Espace multi-éditions (sélecteur « 1 sur 2 éditions » dans le menu).

---

## 12. Décisions ouvertes (à trancher par Mathias — ne rien inventer)

1. **Pagination** : la contrainte B2B « A4 24 pages » contre une pagination variable lue dans
   le PDF. L'outil lit la pagination réelle ; la fiche garde une valeur indicative.
2. **Plans payants** avant un vrai client : Supabase (sauvegardes) et Vercel (le plan Hobby est
   non commercial). Vérifier les tarifs du moment.
3. **Nombre de propositions de couverture** par défaut (3 dans les maquettes ; le catalogue
   disait 2).
4. **Plafond de photos par participant** par défaut et **plafond total**.
5. **Délai de suppression des photos** après livraison.
6. **Échéance de la facture de solde**.
7. **Accord sur les données (DPA)** : contenu juridique, hors outil.
8. **Délai de regroupement** des mails « nouveau message ».
9. **Temps réel** : interrogation (phase 2) suffisante, ou Realtime (phase 7) ?
10. **Largeur de rendu des pages** du BAT (qualité contre poids). Provisoire : 1600 px
    (`LARGEUR_RENDU_PX`, bat.ts), WebP. À mesurer sur un vrai export Affinity (T-144).
11. **Le compte des étapes** affiché au client : les maquettes disent « Étape N sur 6 » côté client
    et « sur 7 » côté atelier. À trancher en phase 2 (T-141).
12. **Le texte du consentement et des conditions** du lien participant (§0.5) : texte légal,
    jamais rédigé d'office (T-142).

---

## 13. Comment lancer le travail dans Claude Code

1. Copier ce fichier dans `docs/produit/PRD-edition-collective.md` et les maquettes dans
   `docs/produit/collectif/maquettes/`. **Ne pas les commiter soi-même** : `main` est protégé.
   Claude Code les ajoute (chemins nommés, jamais `git add -A`) au premier commit de sa branche.
2. Ouvrir Claude Code, **Plan Mode** (Maj+Tab deux fois), coller le prompt de lancement
   fourni avec ce document.
3. Valider le plan de la phase 0, puis une phase à la fois.
