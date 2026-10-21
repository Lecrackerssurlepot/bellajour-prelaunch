# Contrat serveur : personnes, corbeille, album, ouverture (planches du 20/10)

Lot « w1-fondations », 20/10/2026. Le serveur des planches du 20/10 (Audencia, huit bateaux),
validées par Mathias avec ses seize décisions. **Aucun écran n'a changé dans ce lot** : la seconde
vague code les écrans sur ce contrat. Tickets : T-198 (personnes), T-199 (corbeille, album),
T-196 (pages d'état), T-200 (vidéos, déjà fait).

- Migration : `supabase/migrations/20261023_collectif_personnes_corbeille.sql` (ÉCRITE, **pas
  appliquée** : Mathias l'applique). Tout le code se replie sans elle (section 6).
- Harnais : section « w1 » de `scripts/verif-collectif.ts` (62 vérifications), puis la section
  « durcissement » (audit de sécurité du 20/10, contre une fausse base qui lit les filtres comme
  PostgREST). **Ce qui a changé depuis le lot w1 est résumé en section 9** ; les sections 1 à 8
  sont à jour.
- Modules purs : `personnes.ts`, `corbeille.ts`, `album.ts`, `ouverture.ts` (+ `accord.ts`,
  `saisie.ts`, `droits.ts`, `migration.ts`). À effets : `personnesServeur.ts`,
  `corbeilleServeur.ts`, `horsCorbeille.ts` (le repli), `collecte.ts` (comptes).

Toutes les routes publiques sont en POST, **le token dans le corps**, jamais dans l'URL. Les
routes de l'atelier revérifient le cookie `bj_admin` (`quiEstConnecteRequete`) et journalisent
QUI (`prenomDe`). Toute écriture se journalise dans `collectif_evenements` ; jamais une adresse
en clair au journal.

---

## 1. Les règles

### La personne (décision 1, T-198)

- Un participant donne **prénom, nom ET adresse** la première fois. L'adresse est normalisée
  (`normaliserEmail` : sans blanc, en minuscules, ASCII seulement) et **unique par édition**
  (`collectif_participants`). Même adresse = même personne sur tous ses téléphones et tous les
  liens de l'édition.
- ⚠️ **L'adresse n'est PAS vérifiée.** Qui tape celle de quelqu'un envoie en son nom et lit son
  **prénom** et son nombre de photos (accepté le 20/10), **jamais son nom de famille** (S1 :
  `vuePersonneConnue`). Elle **n'ouvre aucun droit de supprimer** et ne montre **aucune photo**
  d'un autre lien ni d'un autre téléphone (la question Q7 de `PROJET-CONFIDENTIALITE-B2B.md` :
  tenue). Chaque présentation d'une adresse connue se journalise (`participant_retrouve`) ; sous un
  autre nom, aussi (`participant_nom_different`), et le responsable le voit (`nomPropose`).
- Un téléphone (le cookie httpOnly `bj_depot_appareil`, déjà écrit sur chaque photo) **parle pour
  une personne** dans une édition (`collectif_participants_appareils`, un téléphone = une personne).
  « Ce n'est pas toi ? » retire ce lien ; les photos restent à leur personne.
- Le participant **ne se renomme jamais** : une adresse connue garde son nom, le nom envoyé est
  ignoré (`nomIgnore: true`). Seuls le responsable et l'atelier renomment (toutes ses photos
  suivent : `collectif_photos.deposant` est réécrit, corbeille comprise).
- L'**atelier** voit l'adresse entière, le **responsable** une version masquée
  (`l•••@audencia.com`), l'**équipe** aucune.
- **L'accord est redemandé sur chaque nouveau téléphone** : le serveur exige toujours
  `accord: true` + `accordVersion` dans chaque déclaration (inchangé, T-184) ; la route
  `depot/participant` dit si CE téléphone l'a déjà donné (`accordDonne`, `accordAJour`).
- Le **nom d'une personne vit sur ses photos** (`deposant`) : c'est ce que lisent la grille, les
  dossiers (`qui:<nom comparé>`, `pers:<lien>:<nom>`), le lot et le résumé. La grille reste donc
  rangée PAR NOM (inchangé) ; deux personnes distinctes portant exactement le même nom s'y
  confondent : la liste des personnes les montre séparées et propose de les fusionner.

### Le plafond (décision 2)

- Le plafond **par personne** se compte par sa **personne** (toutes ses photos, tous ses téléphones)
  quand elle est connue, sinon **par téléphone** comme avant. Sur un lien à plafond propre, sur ce
  lien seulement (inchangé).
- Une photo à la corbeille **libère sa place, qui que soit celui qui l'a supprimée** (S4 de l'audit,
  qui remplace la règle du lot w1 « le responsable la garde ») : l'adresse n'étant pas vérifiée, un
  farceur qui envoie sous l'adresse de quelqu'un épuisait sa place, et le nettoyage du responsable
  ne la lui rendait pas. La même photo rechoisie ne se renvoie jamais (sa clé) : retirée par le
  responsable ou l'atelier, elle reste « déjà là » ; supprimée par son AUTEUR, elle revient et
  reprend sa place (21/10, section 10).
- Le **total** de l'édition ne compte plus aucune photo de la corbeille.

### L'album du lien (décision 3)

- Un participant voit les photos des personnes de **SON lien** (lien général : les photos venues du
  lien général), avec le **prénom** de chacun, jamais le nom complet ni l'adresse.
- « Ne pas publier » reste visible dans l'album ; une photo à la corbeille, non.
- Après la clôture, l'album reste lisible (`ferme: true`) ; rien ne s'y ajoute ni ne s'y supprime.
- ⚠️ **Décision de sécurité de ce lot : l'accord fait foi.** Une photo n'entre dans l'album des
  AUTRES que si son auteur a accepté un texte qui le dit (`VERSIONS_ALBUM` = `2026-10-20`). Les
  photos envoyées sous le texte du 17/10 n'ont jamais été promises au regard des autres : elles
  restent hors de l'album, visibles de leur auteur seulement. **Tant que la page affiche le texte
  du 17/10, l'album des autres est vide** : c'est voulu.
- « Mes photos » : celles envoyées depuis **CE téléphone** sur ce lien, quelle que soit la version
  de l'accord. Celles de la même personne envoyées d'un autre téléphone sont **comptées**
  (`moi.photos`), pas montrées.

### La corbeille (décision 4, T-199)

- Supprimer = **corbeille 30 jours** (`DELAI_CORBEILLE_JOURS`). La photo disparaît tout de suite
  **partout** : grille, comptes, tableau de bord, arrivées, lot de l'atelier, sélection, doublons,
  album, vue de résumé, plafonds.
- Restaurable par le responsable et l'atelier pendant 30 jours : elle revient à sa place (son lien,
  sa personne, « Ma sélection » si elle y était ; rien d'autre n'avait bougé).
- Passé 30 jours : la **purge quotidienne** (après la réponse de `/api/atelier/mails/relever`,
  aucun cron de plus) efface **la LIGNE d'abord, puis le coffre** (S7, qui renverse l'ordre du lot
  w1) : l'intention au journal (`objets_a_effacer`, des clés R2 seulement), la ligne supprimée sous
  condition (toujours à la corbeille, toujours plus vieille que 30 jours) en rendant ses clés, puis
  l'original et la vignette (sous `collectif/<édition>/` seulement), puis ce qui est réglé
  (`objets_effaces`). Un objet qui résiste se retente aux passages suivants, jusqu'à réussite
  (`reprendreObjets`) ; une clé qu'une ligne porte encore ne s'efface jamais. « Restaurer » ne peut
  donc plus ressusciter une photo vide, et une ligne coincée ne retient plus les autres.
- **La ligne est SUPPRIMÉE, pas anonymisée** (décision de ce lot) : elle ne porte que des données
  sur la photo et la personne (nom d'origine, GPS, appareil, empreinte, déposant), la personne ou
  l'organisateur a demandé qu'elle parte, et une ligne gardée bloquerait pour toujours sa clé de
  fichier (unique par édition) : la même photo ne pourrait plus être renvoyée. Le journal garde la
  trace (`photos_effacees` : combien, lesquelles, par qui, quand). À l'inverse de `retention.ts`
  (une édition livrée garde ses lignes comme preuve de l'accord des photos PUBLIÉES).
- « Effacer maintenant » (définitif) : **l'atelier seul, en deux temps** (`verifier: true`, puis
  le geste), seulement des photos déjà à la corbeille.
- La corbeille **ne se voit pas par le lien d'équipe** (403).
- **Qui supprime quoi** : le responsable, n'importe quelle photo arrivée de l'édition ; l'atelier
  aussi ; un participant, **SEULEMENT les photos envoyées depuis CE téléphone** (cookie
  `bj_depot_appareil`) et qui sont à la personne que ce téléphone dit être
  (`peutSupprimerSaPhoto`). ⚠️ **Décision de sécurité de Mathias** : l'adresse n'étant pas
  vérifiée, qui tape celle de quelqu'un ne doit pas pouvoir effacer ses photos ; le téléphone, lui,
  ne se tape pas.
- Une photo à la corbeille **redéclarée** (le même fichier rechoisi) n'est jamais dupliquée
  (`corbeille: true` dans la réponse de `presign`). Mise là par le responsable ou l'atelier, elle
  reste « déjà là » (`ou: "retiree"`) : seuls eux la restaurent. **Mise là par son auteur, choisie
  de nouveau depuis le même appareil ou par la même personne, elle REVIENT** (décision de Mathias du
  21/10, section 10).
- Chaque mise à la corbeille, restauration ou effacement **vide le cache des doublons** de
  l'édition (`collectif_doublons`) : il se recalcule au prochain affichage.

### Les personnes : renommer, fusionner, défaire (décision 5)

- Une personne se désigne par une **référence** : `p:<uuid>` (elle s'est présentée par son
  adresse) ou `n:<nom comparé>` (une personne d'avant, connue par son seul nom ; `clePersonne`).
  Jamais par un libellé affiché. La liste la donne (`ref`).
- **Renommer** : prénom ET nom (80 caractères chacun) ; toutes ses photos suivent.
- **Fusionner** deux personnes : les photos de la `source` vont chez la `cible`, sous le nom gardé
  (`garder: "cible" | "source"`, planche 4B). Si seule la source a une adresse, c'est **elle qui
  reste** (elle seule se retrouve sur un autre téléphone), le nom choisi suit. Une personne
  absorbée garde sa ligne et pointe vers celle qui reste (`fusionne_dans`) : taper son adresse
  retrouve la bonne personne. Garder un nom d'avant d'un seul mot (« Léa ») pour une personne à
  adresse est refusé (409 : la table exige un nom ; on n'en invente pas).
- **Les doublons se PROPOSENT, jamais fusionnés d'office** (`proposees`) : `meme_nom` (même nom sans
  accents ni casse : « Léa Martin » / « Lea Martin ») et `meme_prenom` (« Léa » seule et « Léa
  Martin » sur un même lien). « Sans nom » ne se propose jamais.
- **Défaire une fusion** : l'atelier seul, d'après le journal (`personnes_fusionnees` garde chaque
  photo réécrite et ce qu'elle portait avant). Chaque photo reprend sa personne et son nom d'avant ;
  la personne absorbée ne pointe plus ; celle qui reste retrouve son nom si la fusion l'avait
  changé. Une photo arrivée APRÈS la fusion reste chez la personne qui reste. Défaire remet les noms
  d'avant la fusion, même si un renommage a suivi (le journal le dit).

### L'ouverture (décision 6)

- `collectif_editions.ouverture_le` (facultatif). Avant cette heure, **le participant** est refusé
  (409 `depot_pas_ouvert`) ; le responsable et l'atelier déposent quand ils veulent. Une adresse se
  retrouve avant l'ouverture, une personne ne s'y crée pas.
- Saisie (`saisie.ts`) : un instant ISO **avec fuseau** (l'écran convertit l'heure de Paris par
  `instantDeParis`), toujours **avant la clôture** (422 sinon, champ `ouverture_le`, étape
  « Le calendrier »). Une ouverture passée n'est pas refusée. Inchangée (à la minute) : pas
  réécrite. Vide : n'efface que si elle existait.
- Phrases de la planche 9B : `phrasesPasEncoreOuvert(ouverture_le, registre)` →
  `{ titre: "Le dépôt n'est pas encore ouvert", quand: "Il ouvrira le vendredi 6 novembre à 8 h.", garder }`.

### L'accord (décision 7)

- Nouvelle version `2026-10-20` (`VERSION_ACCORD_ALBUM`) : le texte du 17/10 **mot pour mot**, puis
  la phrase de l'album (`phraseAlbum(lien)`) :
  - lien de contribution : « Les personnes de « {nom du lien} » verront aussi les photos que
    j'envoie ici. » (validée par Mathias) ;
  - lien général : « Les personnes qui envoient leurs photos par ce lien verront aussi celles que
    j'envoie ici. » (validée par Mathias le 20/10).
- `texteAccord(version, { evenement, deOrganisation, lien })` rend le texte exact à afficher.
- Le serveur n'accepte qu'une version **connue et pas plus récente que `VERSION_ACCORD`**
  (`versionAcceptee`, C5) : `2026-10-17` et, depuis la bascule du lot w2 (20/10), `2026-10-20`,
  le jour où la page affiche la phrase.
  Sans cela, un script ou un vieil onglet entrait dans l'album des autres sans l'avoir lue.
- `VERSION_ACCORD` (ce que `Depot.tsx` envoie) **vaut `2026-10-20` depuis le lot w2 (20/10)** :
  la page AFFICHE la phrase (`texteAccord(VERSION_ACCORD, …)`, jamais écrite dans le composant),
  bascule approuvée par Mathias avec les deux phrases. Les deux vérifications du harnais qui
  comparent le texte affiché à `VERSION_ACCORD` ont suivi.

### Les droits (`droits.ts`)

| Action | Rôles |
|---|---|
| `gerer_corbeille` | atelier, responsable |
| `gerer_personnes` | atelier, responsable |
| `defaire_fusion` | atelier |
| `effacer_photo` | atelier |
| `se_presenter` | participant |
| `voir_album` | participant (lecture) |
| `supprimer_ses_photos` | participant |

Le lien d'équipe n'écrit toujours rien et ne voit ni la corbeille ni les adresses.

---

## 2. Les routes du participant (porte du dépôt : `token_depot` seulement)

Un token responsable ou équipe sur ces routes répond 404 `introuvable`, comme un lien inconnu.
`p` : la clé `?p=` du lien de contribution (absente ou vide : le lien général) ; inconnue ou lien
supprimé : 404 `provenance_inconnue`.

### `POST /api/collectif/depot/participant`

Droit `se_presenter`. Frein (S3, `freins.ts`) : **seule l'action `presenter` compte** (ni `qui`,
ni `oublier`), **300 par minute par adresse IP du client ET par lien de dépôt** (80 personnes
derrière le Wi-Fi du campus, deux présentations chacune, passent), plus un frein large de 1 200 par
minute par adresse qui se connecte à Vercel ; 429 `trop_de_demandes`. ⚠️ Une `Map` par instance :
un frein, pas une protection (voir section 9).

**`{ token, p?, action: "presenter", email, prenom?, nom? }`**

| Cas | Réponse |
|---|---|
| adresse inconnue, sans prénom ni nom | 200 `{ statut: "inconnu", nomRequis: true }` ; **rien n'est écrit, aucun cookie** |
| adresse inconnue, prénom ET nom | 201 `{ statut: "cree", journal, …personne }` (le nom complet tapé) |
| adresse connue (nom envoyé ignoré) | 200 `{ statut: "connu", journal, nomIgnore, …personne }` (le **prénom** seul) |

`…personne` = `{ participant: { prenom, nom, nomAffiche }, photos, ceTelephone, accordDonne, accordAJour, place }` :
- `participant` : à la création, ce qui vient d'être tapé ; pour une personne **retrouvée**
  (« connu », et l'action `qui`), **`{ prenom, nom: null, nomAffiche: prenom }`** (S1 : jamais le
  nom de famille de quelqu'un dont on a tapé l'adresse) ;
- `nomIgnore` : `true` dès qu'un prénom et un nom ont été tapés avec une adresse connue, qu'ils
  soient les siens ou non (S1 : le dire seulement quand ils diffèrent ouvrait un oracle du nom de
  famille) ; le nom de la personne ne change jamais d'ici ;
- `journal` : la présentation s'est journalisée (`participant_presente` à la création ;
  `participant_retrouve`, et `participant_nom_different` sous un autre nom, pour une adresse connue) ;
- `photos` : ses photos arrivées dans l'édition, hors corbeille, tous téléphones ;
- `ceTelephone` : celles envoyées depuis ce téléphone (à elle, ou sans personne) ;
- `accordDonne` : la dernière version d'accord donnée depuis ce téléphone pour elle (`null` :
  jamais) ; `accordAJour` : `accordDonne === VERSION_ACCORD` (la version que la page affiche, la
  seule que le serveur accepte de neuf : C5 ; aujourd'hui `2026-10-17`) ;
- `place` : combien elle peut encore envoyer par ce lien (`null` = sans limite).

Le cookie `bj_depot_appareil` est posé s'il manquait (httpOnly, un an, `path=/`), et ce
téléphone parle désormais pour cette personne (un téléphone déjà tenu par quelqu'un d'autre change
de personne).

Erreurs : 400 `corps_illisible`, `email_invalide`, `nom_incomplet` (un seul des deux, avec
`message` au registre), `action_inconnue` ; 409 `depot_pas_ouvert` (`ouverture_le`) ou
`depot_ferme` pour une CRÉATION hors ouverture (une adresse connue se retrouve toujours) ;
503 `migration_personnes_absente` ; 500 `ecriture_impossible` / `lecture_impossible`.

`surCeLien` (21/10) : ses photos arrivées par CE lien (le `p` de la présentation), hors corbeille, de
sa personne (sinon de ce téléphone) ; la carte « Content de vous revoir » dit celui-là, plus `photos`.

**`{ token, action: "qui" }`** : pour qui ce téléphone parle. 200 `{ statut: "aucun" }` (pas de
cookie, pas de personne, ou migration absente) ou `{ statut: "connu", …personne }`. N'écrit rien.

**`{ token, action: "oublier" }`** : « Ce n'est pas toi ? ». 200 `{ ok: true, oublie: 0 | 1 }`,
journal `telephone_oublie`. 503 sans la migration.

### `POST /api/collectif/depot/presign` (changé)

La personne d'une photo est **celle pour qui CE téléphone parle** (`collectif_participants_appareils`,
posé par `presenter`). Connue : son nom va sur la photo (`deposant`), `participant_id` aussi, et le
plafond par personne se compte par elle. **Un champ `email` dans le corps est IGNORÉ** (S2 de
l'audit : lu, il faisait de presign un annuaire des adresses sans frein, et laissait un script
déposer sous le nom de n'importe qui sans même se présenter). Le moteur peut continuer à l'envoyer,
il ne sert à rien ; mieux vaut ne plus l'envoyer.

Nouvelles réponses :
- 409 `depot_pas_ouvert` `{ message, ouverture_le }` : avant l'ouverture, pour un participant ;
- dans `resultats`, une photo à la corbeille : `{ cle, deja: true, photoId, corbeille: true }`.
- (`400 email_invalide` et `409 participant_inconnu` du lot w1 **n'existent plus**.)
- L'accord n'est accepté qu'en `VERSION_ACCORD` ou plus ancienne (C5) : `2026-10-20` envoyé avant
  la bascule de `VERSION_ACCORD` répond 400 `accord_requis`.

⚠️ Le moteur (`moteur.ts`) doit traiter 409 `depot_pas_ouvert` comme un refus du lot avec la
phrase du serveur (comme `accord_requis`), jamais comme une coupure. Pour déposer sous sa personne,
le téléphone se présente d'abord (`depot/participant`, action `presenter`) : c'est ce lien-là que
presign lit. Sans la migration, la règle d'avant s'applique (le nom et le plafond du téléphone).

### `POST /api/collectif/depot/album`

Droit `voir_album`. N'écrit rien. `{ token, p?, vue?: "album" | "miennes", page?: number }`
(page de 60, la plus récente d'abord).

200 :
```
{
  vue, page, suivante: number | null,
  photos: [{ id, vignette: string | null, prenom, moi: boolean, supprimable: boolean, arrivee }],
  lien: { nom: string | null },          // null = le lien général
  ferme: boolean,                          // collecte close : lecture seule
  album: { photos, personnes: number | null } | null,  // page 0 de « album » seulement
  moi: { participant: { prenom, nom: null } | null, photos, ceTelephone, place, sansLimite }
}
```
- `vignette` : adresse signée stable à l'heure (cache navigateur) ; **sans vignette, `null`**
  (S6 : l'album ne signe JAMAIS l'original, qui porte l'EXIF et le GPS de qui l'a pris). L'écran
  montre une tuile vide ou « en préparation » ; la vignette arrive avec le rattrapage du serveur.
- `album` (C1) : lu dans la vue `collectif_photos_album` (quelques lignes), plus en relisant toutes
  les photos du lien. **Sans la vue** (migration 20261023 absente) : `photos` vient d'un compte et
  **`personnes: null`** (ne rien afficher plutôt qu'un nombre faux).
- `moi` (badge) : de ma personne, ou sans personne de ce téléphone ; `moi.participant` porte le
  prénom seul, **`nom: null`** (S1). `supprimable` : ce téléphone peut la supprimer, collecte ouverte.
- `miennes` sans cookie : liste vide.
- Frein (C1) : 600 par minute par adresse du client et par lien, plus le frein large ; 429
  `trop_de_demandes` (l'écran réessaie plus tard, sans boucle serrée).

### `POST /api/collectif/depot/supprimer`

Droit `supprimer_ses_photos`. `{ token, p?, photoIds }` (500 au plus).
200 `{ ok, n, ids, refusees, journal, place }` : `ids` mises à la corbeille (`par: "auteur"`),
`refusees` (pas de ce téléphone, pas à cette personne, déjà à la corbeille, inconnues) sans
erreur ; `place` : la place libérée, tout de suite.
Erreurs : 400 `lot_invalide` ; 403 `appareil_inconnu` (pas de cookie) ; 409 `depot_ferme` ;
429 `trop_de_demandes` (C1 : 200 par minute par adresse du client et par lien, plus le frein
large) ; 503 `migration_personnes_absente`.

---

## 3. Les routes du responsable (porte de l'espace)

### `POST /api/collectif/photos/corbeille`

Droit `gerer_corbeille` (l'équipe : 403 `lecture_seule`, liste comprise).

- `{ token, action: "lister" }` → 200 `{ photos: VuePhotoCorbeille[], total, jours: 30 }`, la
  plus récente d'abord :
  ```
  { id, vignette, nom, qui, lien, lienNom, supprimeeLe, supprimeePar: "auteur"|"responsable"|"atelier",
    parQui, effaceeLe, joursRestants, alerte, selection }
  ```
  `parQui` : « par son auteur, Yanis Haddad », « par Mathilde Roux », « par l'atelier » ;
  `alerte` : sous 3 jours ; `lien` : la clé de `cleDuLien` (`lien:<id>`, `participants`, `vous`,
  `atelier`).
- `{ token, action: "supprimer", photoIds }` → 200 `{ ok, n, ids, refusees, journal }`.
  N'importe quelle photo arrivée de l'édition. Aucune confirmation côté serveur : « Annuler »
  quelques secondes = `restaurer` avec les mêmes ids.
- `{ token, action: "restaurer", photoIds }` → même forme.

Erreurs : 400 `lot_invalide`, `action_inconnue` ; 503 `migration_personnes_absente` ; 500.

### `POST /api/collectif/photos/marquer` (changé)

Nouveau : **`{ token, photoIds, preselection }`** ou **`{ token, photoIds, signalee, motif? }`**
(500 au plus, la barre d'actions des photos cochées) → 200 `{ ok, journal, n, ids }`, une ligne
de journal `photos_marquees`. La forme à une photo (`photoId`) et « Tout » (`toutes: true`) ne
changent pas. Une photo à la corbeille ne se marque pas (404 `introuvable` si rien n'est marqué).
400 `lot_invalide`.

### `POST /api/collectif/personnes`

- `{ token, action: "lister" }` (responsable ou équipe) → 200
  `{ personnes: Personne[], proposees: { a, b, raison }[], avecAdresses }`. Les propositions ne
  vont qu'au responsable.
  ```
  Personne = { ref, participant, nom, prenom, nomDeFamille, cle, email, n, liens: [{ cle, n }],
               telephones, derniere, depuis, nomPropose: { nom, le } | null }
  ```
  `cle` : la clé du filtre de la grille (`qui:<cle>`) ; `email` : masqué (responsable) ou `null`
  (équipe, personne d'avant) ; `liens[].cle` : `lien:<id>` ou `participants` ; `avecAdresses:
  false` : la migration manque, seules les personnes d'avant (par nom) sont listées.
  `nomPropose` (S5, C4) : le DERNIER autre prénom et nom tapé avec son adresse
  (`participant_nom_different`), et quand, tant qu'aucun renommage plus récent ne l'a réglé et qu'il
  diffère encore de son nom ; de quoi proposer « Renommer en … ». `null` pour l'équipe (le journal
  n'est même pas lu), pour une personne d'avant, ou sans rien à proposer.
- `{ token, action: "renommer", personne, prenom, nom }` → 200 `{ ok, n, nom, journal }`.
- `{ token, action: "fusionner", source, cible, garder? }` → 200 `{ ok, n, nom, journal, evenement }`.

Droit `gerer_personnes` pour renommer et fusionner. Erreurs : 404 `personne_introuvable` ;
422 `saisie` (`message`) ; 409 `refuse` (`message`) ; 503 `migration_personnes_absente` ; 500.

---

## 4. Les routes de l'atelier

### `GET | POST /api/admin/collectif/editions/[id]/corbeille`

- `GET` → la même vue que `lister`.
- `POST { action: "supprimer" | "restaurer", photoIds }` → comme le responsable (`par: "atelier"`).
- `POST { action: "effacer", photoIds, verifier: true }` → 200 `{ ok, verifier: true, aEffacer }`
  (rien n'est effacé) ; puis `POST { action: "effacer", photoIds }` → **200**
  `{ ok, n, ids, ratees, journal, aEffacer }`. La LIGNE part d'abord (S7) : `n` photos sont
  effacées pour de bon, même si un objet du coffre a résisté ; `ratees` dit combien de ces photos
  ont un objet resté au coffre, noté au journal et retenté par la purge suivante. (Le **502** du
  lot w1 n'existe plus : sa photo ne « reste » plus à la corbeille.) 500 `ecriture_impossible` si
  l'intention ne s'écrit pas : alors rien n'a bougé.

### `GET | POST /api/admin/collectif/editions/[id]/personnes`

- `GET` → `{ personnes (adresse ENTIÈRE, `nomPropose`), proposees, avecAdresses, fusions: [{ evenement, le, qui,
  reste, part, nomAvant, nomPart, nomApres, n, defaite, interrompue }] }`. `interrompue` (S9) : une
  écriture a échoué après le journal de la fusion ; « défaire » remet chaque photo d'aplomb.
- `POST { action: "renommer" | "fusionner", … }` → comme le responsable.
- `POST { action: "defaire", evenement, verifier: true }` → `{ ok, verifier, defaite, n, reste,
  part, nomAvant, nomPart }` ; sans `verifier` → `{ ok, n, nom, journal }` ; 409 `refuse` si déjà
  défaite ; 404 `fusion_introuvable`.

### Le réglage de l'ouverture : `POST /api/admin/collectif/editions`, `PATCH …/editions/[id]`

Champ `ouverture_le` (instant ISO avec fuseau, ou vide). 422 `saisie` (champ `ouverture_le`) ;
503 `migration_personnes_absente` si on le règle sans la migration (rien n'est écrit). **Le champ est
dans `FormulaireEdition` depuis le 20/10** (un jour du `Calendrier` + une heure, converti par
`instantDeParis`, jamais un `<input type="datetime-local">`, que le harnais refuse).

### La purge quotidienne (aucune route)

`purgeQuotidienne` en `after()` de `/api/atelier/mails/relever`, même échéance que le rattrapage,
500 photos au plus par passage, coupée sans `COLLECTIF_OUVERT`, silencieuse sans la migration.
D'abord **la reprise** (`reprendreObjets`) : les intentions `objets_a_effacer` vieilles de 15 minutes
dont des clés ne sont pas réglées ; une clé qu'une ligne porte encore se règle « à garder », les
autres se retentent (500 clés au plus par passage). Puis la purge, paquet par paquet de 100 : journal
`objets_a_effacer` (`{ cles, n }`), lignes supprimées sous condition (encore à la corbeille, encore
plus vieilles que 30 jours, au moment même de la suppression), objets du coffre des lignes parties,
journal `objets_effaces` (`{ evenement, cles }`), puis `photos_effacees` (`par: "purge"`). Un paquet
que la base refuse se rejoue photo par photo (une ligne coincée ne retient pas les autres) ; un
objet qui résiste : ligne `echec` (`quoi: "corbeille"`) au journal de l'édition, et retenté demain.

---

## 5. Ce que les lectures existantes font désormais

Mêmes routes, **même forme de réponse**, mais sans les photos de la corbeille : grille
(`/api/collectif/photos`, repli et page), arrivées (`/photos/etat`), sélection et signalement
(`/photos/marquer`), fin de collecte (compte), tableau de bord (résumé, repli, mosaïque), fiche de
l'atelier, lot de l'atelier (compte ET lignes, même règle), doublons (signature et lignes),
photos d'un téléphone (`arriveesDeLAppareil`), plafonds, et la vue `collectif_photos_resume`
elle-même (redéfinie par la migration). Le résumé ajoute `participant_id` en dernière colonne ;
la grille et le tableau de bord ne la lisent pas.

⚠️ Non touchés, volontairement : le rattrapage et les vignettes du serveur (une photo de la
corbeille confirmée ou vignettée ne fait de mal à personne), la santé de l'atelier, le
renommage des dossiers (`/api/collectif/dossiers` renomme aussi les photos de la corbeille : une
photo restaurée revient dans le bon dossier).

---

## 6. Sans la migration 20261023

| Ce qui se lit | Repli |
|---|---|
| filtre `supprimee_le` sur une lecture | la même lecture sans lui (`lireHorsCorbeille`, absence retenue une minute) : aucune photo n'est à la corbeille |
| la personne (`participant_id`, tables des personnes) | aucune personne connue : nom et plafond par téléphone, comme avant |
| la vue avec `participant_id` | la vue d'avant (16 colonnes), puis la relecture complète |
| la vue `collectif_photos_album` (C1) | un compte en GET `limit(0)` pour `album.photos`, et `album.personnes: null` |
| `ouverture_le` | absente de l'édition : le lien est ouvert |
| les journaux `participant_nom_different` | aucune personne connue, donc rien à proposer : `nomPropose: null` |

| Ce qui s'écrit | Sans la migration |
|---|---|
| se présenter, « Ce n'est pas toi ? », supprimer (participant, responsable, atelier), restaurer, effacer, renommer, fusionner, défaire, régler l'ouverture | **503 `migration_personnes_absente`** qui nomme le fichier ; rien n'est écrit |
| `email` dans `presign` | ignoré, AVEC ou sans la migration (S2) ; le dépôt continue (la personne de ce téléphone, ou la règle d'avant) |

⚠️ **Le piège du HEAD, mesuré le 20/10 sur la vraie base** : un compte `head: true` filtré sur une
colonne absente rend 400 avec une erreur **sans code ni message** (un HEAD n'a pas de corps) ; le
repli ne peut pas la reconnaître. Tout compte qui porte le filtre de la corbeille se fait donc en
GET `limit(0)` (`COMPTE_SANS_LIGNE`) : même nombre exact, aucune ligne, et 42703 qui nomme la
colonne. Le harnais le vérifie. Ne pas « simplifier » en `head`.

Vérifié le 20/10 contre la VRAIE base, en LECTURE SEULE (migration absente) :
`compterPourPlafond`, `lireExistants`, `placeDuParticipant`, `participantDeLAppareil`,
`trouverParEmail`, `comptesDeLaPersonne`, `chargerPersonnes`, `lireCorbeille`, `lireFusions`
répondent tous (replis ou `absente`), aucune erreur. Et la vue redéfinie, rejouée en mémoire sur
les 1 203 photos réelles (`resumerPhotos`, le miroir du SQL) : 12 lignes identiques à la vue en
place, somme des comptes = 1 203 = photos confirmées non supprimées.

---

## 7. Après avoir appliqué la migration (Mathias)

Les requêtes de vérification sont en tête du fichier SQL (dont `sum(n)` de la vue
`collectif_photos_album`, égale aux deux autres). Puis, **que la donnée ARRIVE** (le repli
l'effacerait en silence) : une présentation et un envoi d'un participant (ligne dans
`collectif_participants`, `participant_id` posé sur ses photos), la même adresse présentée de
nouveau sous un autre nom (lignes `participant_retrouve` et `participant_nom_different` dans
`collectif_evenements`, adresse masquée, et `nomPropose` dans la liste du responsable), une
suppression (`supprimee_le`, `supprimee_par`), une restauration, un réglage d'ouverture, l'album
d'un lien (`album.personnes` est un NOMBRE, plus `null`), et un « Effacer maintenant » sur une photo
de test (une ligne `objets_a_effacer` puis `objets_effaces` qui nomme les mêmes clés).

---

## 8. Ce que la seconde vague doit faire (écrans)

1. `/depot/[token]` : l'adresse d'abord, puis prénom et nom (`presenter`), « Content de te
   revoir, {prenom} » (le PRÉNOM seul : c'est tout ce que la route rend d'une personne retrouvée),
   « Ce n'est pas toi ? », l'accord affiché par `texteAccord(VERSION_ACCORD_ALBUM, …)` puis
   `VERSION_ACCORD` basculé (et les deux vérifications du harnais ; le serveur acceptera
   `2026-10-20` dès la bascule, C5), le moteur qui lit `depot_pas_ouvert` / `corbeille` (il n'a
   plus à envoyer `email` : presign l'ignore, S2 ; `participant_inconnu` n'existe plus), l'album et
   « Mes photos » (une vignette `null` = une tuile sans image, jamais l'original), supprimer ses
   photos (feuille de confirmation), les pages 9B (pas encore ouvert : `phrasesPasEncoreOuvert`) et
   9C (collecte terminée, album en lecture). La page serveur peut lire `edition.ouverture_le` (déjà
   dans `select("*")`) et `participantDeLAppareil` directement ; ⚠️ elle n'en montre que
   `vuePersonneConnue(…)` (le prénom), jamais `nom` : le téléphone peut parler pour une adresse
   tapée par quelqu'un d'autre (S1). Un 429 `trop_de_demandes` se dit et se réessaie plus tard.
   **Fait le 20/10 (lot w2-depot)** : `Depot.tsx` (se présenter, l'accord par `texteAccord`),
   `Album.tsx` (l'album, « Mes photos », supprimer), `Etats.tsx` (9B, 9C), `LienMort.tsx` (9A),
   `appels.ts`, `depotParticipant.ts` (pur), le moteur (`auCoffre`, `apercus`, 409
   `depot_pas_ouvert`, plus aucune adresse envoyée) ; `VERSION_ACCORD` basculé à `2026-10-20`.
   Voir T-198 et T-199.
2. Page Photos du responsable : la corbeille (planche 5), agrandir et agir (planche 3 : `marquer`
   avec `photoIds`, `corbeille` `supprimer` puis « Annuler » = `restaurer`), une personne
   (planche 4 : `personnes`), et son `nomPropose` (« Quelqu'un a aussi tapé cette adresse sous
   le nom … », avec « Renommer » : texte à faire valider par Mathias).
3. Fiche de l'atelier : la corbeille (« Effacer maintenant » en deux temps ; `ratees` > 0 se dit
   « effacée ; un fichier sera retiré du coffre à la prochaine purge », plus de 502), les personnes
   (`nomPropose`) et les fusions à défaire (`interrompue` d'abord), le champ « Ouverture du dépôt ».
   **Fait le 20/10 (lot w2-atelier)** : `PanneauCorbeille`, `PanneauPersonnes`, `FormulaireEdition` (voir T-198
   et T-199), `ratees`, `nomPropose` et `interrompue` branchés. Pas de « mettre à la corbeille » côté atelier :
   la fiche n'a pas de grille avec sélection.
4. `PROJET-CONFIDENTIALITE-B2B.md` (Q6) : l'adresse d'un participant n'est **pas** effacée par la
   purge de la corbeille ni par `collectif-retention.ts` aujourd'hui ; à brancher quand la
   politique est validée (T-158, T-159). Voir C3, section 9.

---

## 9. Changements du durcissement

Audit de sécurité du lot w1, corrigé le 20/10 AVANT que Mathias applique 20261023 (branche
`fix/collectif-personnes-durcissement`). Chaque correction a son épreuve dans la section
« durcissement » du harnais, contre une fausse base qui lit les filtres comme PostgREST ; ces
épreuves échouaient contre le code du lot w1.

| Constat | Ce qui change | Forme des réponses |
|---|---|---|
| **S1** l'adresse d'un autre rendait son nom de famille | `vuePersonneConnue` (personnes.ts) : une personne RETROUVÉE ne rend que son prénom ; `nomIgnore` vaut dès qu'un nom est tapé (plus d'oracle du nom de famille, lettre à lettre) | `depot/participant` « connu » et `qui` : `participant: { prenom, nom: null, nomAffiche: prenom }` ; « cree » inchangé. `depot/album` : `moi.participant.nom: null`. `nomIgnore` : `true` dès qu'un nom est tapé |
| **S2** presign lisait `email` | presign IGNORE `email` : la personne est celle de CE téléphone (`participantDeLAppareil`) | `400 email_invalide` et `409 participant_inconnu` de presign **supprimés** |
| **S3** frein de 20 par IP, comptant tout | `freins.ts` + `creerFrein`, `ipDuClient`, `ipDeConnexion` (compte/garde.ts, `creerPlafond` inchangé pour ses autres appelants) : seule `presenter` compte ; 300 / minute par IP du client (`cf-connecting-ip` si Cloudflare la pose, sinon la première de `x-forwarded-for`, sinon `x-real-ip`) ET par lien ; plus 1 200 / minute par IP qui se connecte à Vercel | 429 `trop_de_demandes` inchangé, plus rare |
| **S4** la place gardée par une photo retirée par le responsable | `compteDansLaPlace` : une photo de la corbeille ne compte plus, qui que soit celui qui l'a supprimée ; `FILTRE_PLACE_PERSONNE` retiré (le filtre est `supprimee_le is null`, comme le total) | aucune |
| **S5** squat du nom invisible | `participant_retrouve` à chaque présentation d'une adresse connue (adresse masquée, ni token ni téléphone) ; `participant_nom_different` sous un autre nom (les deux noms) | `presenter` « connu » porte aussi `journal` |
| **C4** le responsable ne le voyait pas | `nomsProposes` (personnes.ts), lu par `chargerPersonnes` (500 lignes de journal au plus) | `Personne.nomPropose: { nom, le } \| null` (responsable, atelier ; `null` pour l'équipe) |
| **S6** l'album signait l'original | la vignette seulement | `photos[].vignette: null` sans vignette (avant : l'original) |
| **C5** `2026-10-20` accepté avant d'être affiché | `versionAcceptee` (accord.ts) : connue ET ≤ `VERSION_ACCORD` | presign : `2026-10-20` → 400 `accord_requis` tant que `VERSION_ACCORD` vaut `2026-10-17`. `accordAJour` compare à `VERSION_ACCORD` |
| **S7** le coffre avant la ligne | intention au journal → ligne (re-contrôlée : corbeille, et pour la purge plus vieille que 30 jours) qui rend ses clés → coffre → réglé ; `reprendreObjets` retente jusqu'à réussite | « Effacer maintenant » : **200** avec `ratees` (plus de 502) |
| **C2** une ligne coincée bloquait la purge | un paquet refusé se rejoue photo par photo ; un paquet en panne n'arrête plus les suivants ; plus de ligne gardée pour un objet qui résiste | aucune |
| **S8** `.in()` sur du texte de client | `citerPostgrest` / `listeIn` (lignes.ts), posés par `.filter(c, "in", …)` : `deposant` (personnesServeur.ts), `cle_fichier` (collecte.ts), et la grille (`resumePhotos.ts`, seconde ceinture). Grammaire vérifiée contre la vraie base, en lecture seule | aucune |
| **S9** fusion journalisée après coup | journal AVANT toute écriture (`journaliserId`), rien d'écrit sans lui ; une panne au milieu écrit `fusion_interrompue` ; défaire la remet d'aplomb | `fusions[].interrompue` (GET de l'atelier) |
| **C1** l'album relisait toutes les photos du lien | vue NEUVE `collectif_photos_album` dans 20261023 (le fichier, toujours non appliqué) ; frein sur `album` et `depot/supprimer` | `album.personnes: number \| null` (`null` sans la vue) ; 429 possible sur `album` et `supprimer` |

Nouveaux types de journal (recit.ts les dit en français) : `participant_retrouve`,
`participant_nom_different`, `fusion_interrompue`, `objets_a_effacer`, `objets_effaces`.
⚠️ `participant_retrouve` s'écrit à CHAQUE présentation d'une adresse connue : il n'est pas dans
`JOURNAL_DE_LOT`, il peut peupler les 100 dernières lignes de la fiche le jour de l'événement.
À trancher avec la seconde vague de la fiche.

**Ce que le frein n'est pas** : une `Map` par instance Vercel (deux instances comptent chacune de
leur côté, un redémarrage remet à zéro). `cf-connecting-ip` s'écrit par un appelant qui vise
l'adresse *.vercel.app directement : d'où le second frein, large, sur l'adresse que Vercel voit
(qui ne se forge pas). Il freine un script naïf qui essaie des adresses ; il n'arrête pas une
attaque. La vraie borne de l'oracle : une adresse tapée ne rend que le prénom et un nombre de
photos (S1), et presign n'en lit plus aucune (S2).

**C3, en attente (non traité, volontairement)** : les noms et prénoms restent dans le journal
(`participant_presente`, `participant_retrouve`, `participant_nom_different`, `personne_renommee`,
`personnes_fusionnees`) après la purge des photos, et l'adresse d'un participant
(`collectif_participants.email`) n'est jamais purgée. Cela dépend de la politique de
confidentialité que Mathias n'a pas encore tranchée (`PROJET-CONFIDENTIALITE-B2B.md`, T-158,
T-159) : rien n'est effacé ni anonymisé d'ici avant sa décision.

---

## 10. Le dépôt du 21/10 : le dernier envoi, les « déjà là » par cas, le lien mort

Retours de Mathias sur l'édition d'essai « Recette 1 » (lien « Bateau 1 » à 5 photos, « Bateau 2 » à
30, le même iPhone sur les deux, des suppressions, puis les mêmes photos choisies de nouveau). Pas de
migration : tout se lit dans les colonnes de 20261013 et 20261023. Harnais : section « 21/10 » de
`scripts/verif-collectif.ts` (purs, le vrai moteur contre un faux serveur, la fausse base, le code).

| Constat | Ce qui change | Forme des réponses |
|---|---|---|
| « Merci Mathias, 8 photos reçues » sur un lien à 5, rien de parti | Le merci compte le DERNIER envoi (`vue.lot` du moteur, `compterLot`, `bilanDuLot`) et seulement ce qui est ARRIVÉ ; la barre ne compte plus les « déjà là » (`progression(vue.lot)`) | aucune |
| les « déjà là » invisibles | Chaque « déjà là » dit OÙ (`origineDeja`, `depot.ts`) ; la page le dit par cas (`phrasesDuLot`) | `presign` : `ou` (`album`, `lien` + `lien` : le libellé, `null` pour le lien général, `edition`, `retiree`, `supprimee`, `restauree` + `ici`) ; `connues` : `{ confirmees, aRevoir, details: [{ cle, ou, lien }] }`, et le corps porte `p` |
| re-choisir une photo supprimée | Supprimée par son AUTEUR (`supprimee_par = 'auteur'`), choisie de nouveau par un participant depuis le même appareil ou par la même personne (`restaurableParChoix`) : elle REVIENT dans son album d'origine, compte de nouveau dans le plafond de SON lien ; sans place, elle reste à la corbeille et la phrase du plafond le dit. Écrite APRÈS l'insertion du lot, conditionnée à `supprimee_par = 'auteur'`, journal `photos_restaurees` avec `par: "auteur"` | `presign` : `{ cle, deja: true, photoId, restauree: true, ou: "restauree", ici, lien }` ; sans place `{ cle, erreur: "plafond_…", message, corbeille: true }` |
| « Content de vous revoir, 11 photos déjà arrivées » (toute l'édition) | La carte et l'annonce de retour disent CE lien et ce qui reste (`phraseRetour`) | `depot/participant` : `surCeLien` |
| « Mes photos · 1 », « Envoyées depuis ce téléphone » sur un ordinateur | « cet appareil » partout ; les photos à son nom sur ce lien envoyées d'un autre appareil se COMPTENT (`phraseAutresAppareils`), sans se montrer ni se supprimer | `depot/album` : `moi.autresAppareils` (page 0) et `total` (« miennes », page 0) ; `moi.photos` et `moi.ceTelephone` restent ceux de toute l'édition |
| le lien régénéré « fonctionne encore » dans l'onglet ouvert | « Tout l'album » relit sa page 0 toutes les 45 s onglet visible et au retour sur l'onglet (au plus toutes les 20 s) ; un 404 d'`album`, `presign` (déclaration ou vérification), `complete`, `supprimer` ou `participant` fait basculer TOUTE la page sur `CarteLienMort` (le texte de `lienMort()`) | aucune (le 404 existait) |

Le dépôt du responsable (`FenetreEnvoi`, `ZoneDepot`, la pastille) lit le même lot : « arrivées »
ne compte plus les « déjà là », qui ont leur case ; une photo à la corbeille a sa phrase (« La
corbeille de la page Photos la restaure »). Rien ne s'y restaure tout seul.

⚠️ Ce que la règle ne fait pas : une photo choisie d'un AUTRE appareil a une autre clé (le sel est
celui de l'appareil) ; elle part comme une nouvelle, et le repérage des doublons le dira.
