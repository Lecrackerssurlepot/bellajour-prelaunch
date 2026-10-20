# Contrat serveur : personnes, corbeille, album, ouverture (planches du 20/10)

Lot « w1-fondations », 20/10/2026. Le serveur des planches du 20/10 (Audencia, huit bateaux),
validées par Mathias avec ses seize décisions. **Aucun écran n'a changé dans ce lot** : la seconde
vague code les écrans sur ce contrat. Tickets : T-198 (personnes), T-199 (corbeille, album),
T-196 (pages d'état), T-200 (vidéos, déjà fait).

- Migration : `supabase/migrations/20261023_collectif_personnes_corbeille.sql` (ÉCRITE, **pas
  appliquée** : Mathias l'applique). Tout le code se replie sans elle (section 6).
- Harnais : section « w1 » de `scripts/verif-collectif.ts` (62 vérifications).
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
  prénom et son nombre de photos (accepté le 20/10). Elle **n'ouvre aucun droit de supprimer** et
  ne montre **aucune photo** d'un autre lien ni d'un autre téléphone (la question Q7 de
  `PROJET-CONFIDENTIALITE-B2B.md` : tenue).
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
- Une photo supprimée **par son auteur** libère sa place. Une photo retirée par le responsable ou
  l'atelier la **garde** (décision de ce lot : sinon un dépôt indésirable se renverrait sans fin).
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
  aucun cron de plus) efface le **coffre d'abord** (original + vignette, sous `collectif/<édition>/`
  seulement), **puis la ligne**, et seulement pour une photo dont tous les objets sont partis.
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
- Une photo à la corbeille **redéclarée** (le même fichier rechoisi) reste « déjà là »
  (`corbeille: true` dans la réponse de `presign`) : ni dupliquée, ni ressuscitée. Seuls le
  responsable et l'atelier la restaurent.
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
    j'envoie ici. » (**proposée par ce lot, à relire par Mathias : texte légal**).
- `texteAccord(version, { evenement, deOrganisation, lien })` rend le texte exact à afficher.
- Le serveur accepte `2026-10-17` ET `2026-10-20` ; aucune autre. L'ancienne reste lisible.
- ⚠️ `VERSION_ACCORD` (ce que `Depot.tsx` envoie) **reste `2026-10-17`** : il ne passe à
  `2026-10-20` que le jour où la page AFFICHE la phrase (sinon on enregistrerait un accord que
  personne n'a lu). La seconde vague le bascule, et met à jour les deux vérifications du harnais
  qui comparent le texte affiché à `VERSION_ACCORD` (« le texte AFFICHÉ est mot pour mot… » et
  « la version courante est le jour du choix de Mathias »).

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

Droit `se_presenter`. Frein : 20 demandes par minute et par appelant (429 `trop_de_demandes`).

**`{ token, p?, action: "presenter", email, prenom?, nom? }`**

| Cas | Réponse |
|---|---|
| adresse inconnue, sans prénom ni nom | 200 `{ statut: "inconnu", nomRequis: true }` ; **rien n'est écrit, aucun cookie** |
| adresse inconnue, prénom ET nom | 201 `{ statut: "cree", journal, …personne }` |
| adresse connue (nom envoyé ignoré) | 200 `{ statut: "connu", nomIgnore, …personne }` |

`…personne` = `{ participant: { prenom, nom, nomAffiche }, photos, ceTelephone, accordDonne, accordAJour, place }` :
- `photos` : ses photos arrivées dans l'édition, hors corbeille, tous téléphones ;
- `ceTelephone` : celles envoyées depuis ce téléphone (à elle, ou sans personne) ;
- `accordDonne` : la dernière version d'accord donnée depuis ce téléphone pour elle (`null` :
  jamais) ; `accordAJour` : `accordDonne === "2026-10-20"` ;
- `place` : combien elle peut encore envoyer par ce lien (`null` = sans limite).

Le cookie `bj_depot_appareil` est posé s'il manquait (httpOnly, un an, `path=/`), et ce
téléphone parle désormais pour cette personne (un téléphone déjà tenu par quelqu'un d'autre change
de personne).

Erreurs : 400 `corps_illisible`, `email_invalide`, `nom_incomplet` (un seul des deux, avec
`message` au registre), `action_inconnue` ; 409 `depot_pas_ouvert` (`ouverture_le`) ou
`depot_ferme` pour une CRÉATION hors ouverture (une adresse connue se retrouve toujours) ;
503 `migration_personnes_absente` ; 500 `ecriture_impossible` / `lecture_impossible`.

**`{ token, action: "qui" }`** : pour qui ce téléphone parle. 200 `{ statut: "aucun" }` (pas de
cookie, pas de personne, ou migration absente) ou `{ statut: "connu", …personne }`. N'écrit rien.

**`{ token, action: "oublier" }`** : « Ce n'est pas toi ? ». 200 `{ ok: true, oublie: 0 | 1 }`,
journal `telephone_oublie`. 503 sans la migration.

### `POST /api/collectif/depot/presign` (changé)

Nouveau champ facultatif **`email`** dans la déclaration : la personne déjà présentée. Sans lui,
la personne de CE téléphone. Connue : son nom va sur la photo (`deposant`), `participant_id` aussi,
et le plafond par personne se compte par elle.

Nouvelles réponses :
- 409 `depot_pas_ouvert` `{ message, ouverture_le }` : avant l'ouverture, pour un participant ;
- 400 `email_invalide` ; 409 `participant_inconnu` `{ message }` : l'adresse n'a pas été présentée ;
- dans `resultats`, une photo à la corbeille : `{ cle, deja: true, photoId, corbeille: true }`.

⚠️ Le moteur (`moteur.ts`) doit traiter 409 `depot_pas_ouvert` et `participant_inconnu` comme un
refus du lot avec la phrase du serveur (comme `accord_requis`), jamais comme une coupure.
Sans la migration, `email` est ignoré (le serveur le note) et la règle d'avant s'applique.

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
  album: { photos, personnes } | null,     // page 0 de « album » seulement
  moi: { participant: { prenom, nom } | null, photos, ceTelephone, place, sansLimite }
}
```
- `vignette` : adresse signée stable à l'heure (cache navigateur) ; sans vignette, l'original s'il
  s'affiche ; `null` pour un HEIC sans vignette.
- `moi` (badge) : de ma personne, ou sans personne de ce téléphone. `supprimable` : ce téléphone
  peut la supprimer, collecte ouverte.
- `miennes` sans cookie : liste vide.

### `POST /api/collectif/depot/supprimer`

Droit `supprimer_ses_photos`. `{ token, p?, photoIds }` (500 au plus).
200 `{ ok, n, ids, refusees, journal, place }` : `ids` mises à la corbeille (`par: "auteur"`),
`refusees` (pas de ce téléphone, pas à cette personne, déjà à la corbeille, inconnues) sans
erreur ; `place` : la place libérée, tout de suite.
Erreurs : 400 `lot_invalide` ; 403 `appareil_inconnu` (pas de cookie) ; 409 `depot_ferme` ;
503 `migration_personnes_absente`.

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
               telephones, derniere, depuis }
  ```
  `cle` : la clé du filtre de la grille (`qui:<cle>`) ; `email` : masqué (responsable) ou `null`
  (équipe, personne d'avant) ; `liens[].cle` : `lien:<id>` ou `participants` ; `avecAdresses:
  false` : la migration manque, seules les personnes d'avant (par nom) sont listées.
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
  (rien n'est effacé) ; puis `POST { action: "effacer", photoIds }` → 200
  `{ ok, n, ids, ratees, journal, aEffacer }`, **502** si un objet du coffre a résisté (sa photo
  reste à la corbeille, la purge réessaiera).

### `GET | POST /api/admin/collectif/editions/[id]/personnes`

- `GET` → `{ personnes (adresse ENTIÈRE), proposees, avecAdresses, fusions: [{ evenement, le, qui,
  reste, part, nomAvant, nomPart, nomApres, n, defaite }] }`.
- `POST { action: "renommer" | "fusionner", … }` → comme le responsable.
- `POST { action: "defaire", evenement, verifier: true }` → `{ ok, verifier, defaite, n, reste,
  part, nomAvant, nomPart }` ; sans `verifier` → `{ ok, n, nom, journal }` ; 409 `refuse` si déjà
  défaite ; 404 `fusion_introuvable`.

### Le réglage de l'ouverture : `POST /api/admin/collectif/editions`, `PATCH …/editions/[id]`

Champ `ouverture_le` (instant ISO avec fuseau, ou vide). 422 `saisie` (champ `ouverture_le`) ;
503 `migration_personnes_absente` si on le règle sans la migration (rien n'est écrit). **Le champ
n'est pas encore dans `FormulaireEdition`** (seconde vague : un jour du `Calendrier` + une heure,
converti par `instantDeParis`, jamais un `<input type="datetime-local">`, que le harnais refuse).

### La purge quotidienne (aucune route)

`purgeQuotidienne` en `after()` de `/api/atelier/mails/relever`, même échéance que le rattrapage,
500 photos au plus par passage, coupée sans `COLLECTIF_OUVERT`, silencieuse sans la migration.
Journal `photos_effacees` (`par: "purge"`) ; un objet qui résiste : ligne `echec`
(`quoi: "corbeille"`) au journal de l'édition.

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
| `ouverture_le` | absente de l'édition : le lien est ouvert |

| Ce qui s'écrit | Sans la migration |
|---|---|
| se présenter, « Ce n'est pas toi ? », supprimer (participant, responsable, atelier), restaurer, effacer, renommer, fusionner, défaire, régler l'ouverture | **503 `migration_personnes_absente`** qui nomme le fichier ; rien n'est écrit |
| `email` dans `presign` | ignoré, noté au serveur ; le dépôt continue (règle d'avant) |

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

Les requêtes de vérification sont en tête du fichier SQL. Puis, **que la donnée ARRIVE** (le repli
l'effacerait en silence) : une présentation et un envoi d'un participant (ligne dans
`collectif_participants`, `participant_id` posé sur ses photos), une suppression
(`supprimee_le`, `supprimee_par`), une restauration, un réglage d'ouverture.

---

## 8. Ce que la seconde vague doit faire (écrans)

1. `/depot/[token]` : l'adresse d'abord, puis prénom et nom (`presenter`), « Content de te
   revoir », « Ce n'est pas toi ? », l'accord affiché par `texteAccord(VERSION_ACCORD_ALBUM, …)`
   puis `VERSION_ACCORD` basculé (et les deux vérifications du harnais), le moteur qui envoie
   `email` dans chaque déclaration et lit `depot_pas_ouvert` / `participant_inconnu` /
   `corbeille`, l'album et « Mes photos », supprimer ses photos (feuille de confirmation), les
   pages 9B (pas encore ouvert : `phrasesPasEncoreOuvert`) et 9C (collecte terminée, album en
   lecture). La page serveur peut lire `edition.ouverture_le` (déjà dans `select("*")`) et
   `participantDeLAppareil` directement.
2. Page Photos du responsable : la corbeille (planche 5), agrandir et agir (planche 3 : `marquer`
   avec `photoIds`, `corbeille` `supprimer` puis « Annuler » = `restaurer`), une personne
   (planche 4 : `personnes`).
3. Fiche de l'atelier : la corbeille (« Effacer maintenant » en deux temps), les personnes et les
   fusions à défaire, le champ « Ouverture du dépôt ».
4. `PROJET-CONFIDENTIALITE-B2B.md` (Q6) : l'adresse d'un participant n'est **pas** effacée par la
   purge de la corbeille ni par `collectif-retention.ts` aujourd'hui ; à brancher quand la
   politique est validée (T-158, T-159).
