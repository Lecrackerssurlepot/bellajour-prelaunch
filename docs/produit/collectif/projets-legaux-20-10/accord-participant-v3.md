# L'accord du participant, troisième version : projet

> **Statut : PROJET. Texte légal : rien ne change sur le site sans l'accord explicite de Mathias.**
> `src/lib/collectif/accord.ts` et la page `/depot` n'ont pas été touchés.
> Décisions intégrées : Q1 (le texte), Q2 (l'adresse e-mail), Q4 (30 jours après « Marquer
> livrée »), Q5 (le fichier du magazine terminé est gardé, durée non fixée). Rédigé le 20/10/2026.
> Le texte affiché est en français seulement aujourd'hui ; une version PT ou EN de la page de
> dépôt n'existe pas (à décider avec la relecture si des participants non francophones sont
> invités).

## 1. Ce qui est en ligne aujourd'hui (vérifié dans le code du 20/10)

La page affiche la version **`2026-10-20`** (`accord.ts:49`) : le texte du 17/10 mot pour mot, puis
la phrase de l'album, encadrée sous la case (`accord.ts:61-64`, `depotParticipant.ts:21-24`).

Sur un lien de contribution (« Bateau 1 ») :

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} »
> {deOrganisation}, et je confirme avoir le droit de les partager, y compris pour les personnes
> qu'on y voit. **Les personnes de « {lien} » verront aussi les photos que j'envoie ici.**

Sur le lien général :

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} »
> {deOrganisation}, et je confirme avoir le droit de les partager, y compris pour les personnes
> qu'on y voit. **Les personnes qui envoient leurs photos par ce lien verront aussi celles que
> j'envoie ici.**

Sous le champ de l'adresse (`Depot.tsx:425-432`), en vous et en tu :

> Elle sert seulement à vous reconnaître sur un autre téléphone ou un autre lien. Nous ne vous
> écrirons pas pour autre chose.
>
> Elle sert seulement à te reconnaître sur un autre téléphone ou un autre lien. Nous ne t'écrirons
> pas pour autre chose.

Ce que ce texte ne dit pas encore : qui d'autre voit les photos (l'organisateur et son équipe),
combien de temps elles sont gardées, et où lire le reste. **La page `/depot` n'a aucun lien vers la
politique de confidentialité** (recherche de `confidentialite` dans `src/app/depot`,
`src/app/edition` et `src/lib/collectif` : aucun résultat).

## 2. Le nouveau texte

### Une remarque d'abord : le texte est à la première personne

L'accord est écrit en « je » : c'est le participant qui parle. **Il est donc le même en tu et en
vous** (aujourd'hui déjà, `texteAccord` ne reçoit pas le registre de l'édition, `accord.ts:91-95`).
Seuls changent, selon le registre, le lien placé sous la case et la phrase sous le champ de
l'adresse (section 3).

### La phrase qui rend la décision Q5 vraie

Le texte validé en Q1 dit « Elles seront supprimées 30 jours après la livraison du magazine. »
Avec Q5, ce n'est plus vrai pour les photos retenues : le fichier du magazine terminé, qui les
contient, est gardé plusieurs années pour une réimpression. La formulation la plus courte qui reste
vraie ajoute une relative de neuf mots, sans durée (la durée n'est pas fixée, et elle vit dans la
politique) :

> Elles seront supprimées 30 jours après la livraison du magazine, **dont seul le fichier est
> gardé pour une réimpression**.

« Le fichier » plutôt que « le PDF » : le mot technique ne dit rien à un participant ; « le
magazine terminé » prêterait à confusion avec l'exemplaire imprimé. « Pour une réimpression » dit
la seule finalité (Q5 : jamais réutilisé sans l'accord du client).

### Version A, celle de la décision Q1 (la phrase de l'album fondue dans le texte)

**Lien de contribution :**

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} »
> {deOrganisation}. L'organisateur et son équipe les verront avec mon nom, et les personnes de
> « {lien} » verront aussi les photos que j'envoie ici. Elles seront supprimées 30 jours après la
> livraison du magazine, dont seul le fichier est gardé pour une réimpression. Je confirme avoir
> le droit de les partager, y compris pour les personnes qu'on y voit.

**Lien général :**

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} »
> {deOrganisation}. L'organisateur et son équipe les verront avec mon nom, et les personnes qui
> envoient leurs photos par ce lien verront aussi celles que j'envoie ici. Elles seront supprimées
> 30 jours après la livraison du magazine, dont seul le fichier est gardé pour une réimpression.
> Je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit.

La phrase du lien général est celle que Mathias a validée (« Les personnes qui envoient leurs
photos par ce lien verront aussi celles que j'envoie ici. »), mot pour mot, la majuscule devenue
minuscule après « et ».

Exemple rempli (Audencia, lien « Bateau 1 ») : « J'accepte que Bellajour utilise ces photos pour
composer le magazine « 60 ans » d'Audencia. L'organisateur et son équipe les verront avec mon nom,
et les personnes de « Bateau 1 » verront aussi les photos que j'envoie ici. Elles seront
supprimées 30 jours après la livraison du magazine, dont seul le fichier est gardé pour une
réimpression. Je confirme avoir le droit de les partager, y compris pour les personnes qu'on y
voit. »

### Version B, si la phrase de l'album doit rester encadrée (planche 6)

Aujourd'hui la page encadre la phrase de l'album, à la fin (`decouperAccord`,
`depotParticipant.ts:21-24`, qui ne la trouve QUE si elle termine le texte). Si Mathias veut garder
ce cadre, les mêmes mots dans un autre ordre :

> J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} »
> {deOrganisation}. L'organisateur et son équipe les verront avec mon nom. Elles seront supprimées
> 30 jours après la livraison du magazine, dont seul le fichier est gardé pour une réimpression.
> Je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit.
> **[encadré]** Les personnes de « {lien} » verront aussi les photos que j'envoie ici.
> *(lien général : « Les personnes qui envoient leurs photos par ce lien verront aussi celles que
> j'envoie ici. »)*

Les deux versions disent exactement la même chose ; B garde les deux phrases validées le 20/10
intactes et le code de l'encadré tel quel. **À choisir par Mathias.**

### La version

Une NOUVELLE entrée de `TEXTES_ACCORD`, jamais une modification des deux autres (des photos les
portent). Son nom : [À FIXER : le jour de la mise en ligne, au format `AAAA-MM-JJ`], **strictement
après `2026-10-20`** : le serveur compare les versions comme des chaînes de jours
(`versionAcceptee`, `accord.ts:114-116`), deux versions le même jour sont impossibles.

## 3. Le lien sous la case

Une ligne sous la case d'accord, avant le bouton « Choisir mes photos » :

- registre vous : **« Comment Bellajour traite vos données »**
- registre tu : **« Comment Bellajour traite tes données »**

Il mène à la section 13 de la politique : `/confidentialite#edition-collective`, **dans un nouvel
onglet** (le participant ne doit pas perdre son prénom, son nom et sa case cochée en le lisant).

La phrase sous le champ de l'adresse (Q2) ne change pas : elle est déjà en ligne et la décision la
confirme.

## 4. Ce qui doit être VRAI dans le code le jour où ce texte passe en ligne

Chaque ligne est une phrase du texte ; la colonne de droite dit où en est le code le 20/10.

| Le texte dit | Ce qui doit être vrai | État le 20/10 |
|---|---|---|
| « L'organisateur et son équipe les verront avec mon nom » | le responsable et le lien d'équipe voient chaque photo avec le nom de qui l'a envoyée | **vrai** (`api/collectif/photos` rend `qui` ; équipe en lecture, `src/lib/collectif/CLAUDE.md` T-180) |
| « les personnes de « {lien} » verront aussi… » | une photo envoyée sous la NOUVELLE version entre dans l'album de son lien | **à faire** : ajouter la nouvelle version à `VERSIONS_ALBUM` (`accord.ts:67`). Oubliée, les photos des nouveaux participants ne seraient plus montrées aux autres, en silence |
| idem | l'album ne montre que le prénom et une image réduite, jamais l'original | **vrai** (`album.ts:11`, audit S6) |
| idem | le serveur accepte la nouvelle version seulement quand la page l'affiche | **à faire au même geste** : `VERSION_ACCORD` passe à la nouvelle version (`accord.ts:49`) ; les deux vérifications du harnais qui comparent le texte affiché à la version courante suivent |
| « Elles seront supprimées 30 jours après la livraison » | l'effacement du coffre d'une édition livrée tourne, 30 jours après « Marquer livrée » | **pas en service** : `scripts/collectif-retention.ts --jours N` existe, n'a jamais tourné avec `--vraiment`, n'a pas de cron (T-159). Décision Q4 : les premières fois avec Mathias, ensuite chaque jour tout seul |
| idem | les écrans de l'espace et de la fiche savent qu'une édition est effacée | **à faire** : `photos_supprimees_le` n'est lu par aucun écran (T-159, prérequis 1) |
| idem | les copies hors du coffre partent aussi | **à faire** : une procédure pour les lots téléchargés par l'atelier et les fichiers de composition sur ses postes (T-159, prérequis 2) |
| idem | rien ne survit dans une sauvegarde ou une version du coffre au-delà de ce qui est dit | **non vérifié** : versioning du bucket R2, sauvegardes Supabase, journaux Brevo et Vercel |
| idem | le nom d'origine du fichier ne reste nulle part | **à faire** : `cle_fichier` le contient encore après l'effacement (colonne obligatoire et unique, `retention.ts:243-245`) |
| « dont seul le fichier est gardé » | seul le PDF du magazine terminé reste ; les PDF des tours intermédiaires partent avec les photos | **faux aujourd'hui** : la table `FAMILLES` garde le PDF de CHAQUE tour (`retention.ts:170-174`). Il faut garder le seul PDF du dernier tour de chaque magazine validé, et effacer les autres |
| idem | ce fichier n'est jamais réutilisé sans l'accord du client, et il est effacé à la fin de sa durée | **à faire** : une seconde règle d'effacement, le jour où la durée est fixée (10 ans) |
| (politique, Q2) « effacée avec les photos » | l'adresse e-mail du participant part dans le même passage | **faux aujourd'hui** : `collectif_participants.email` n'est jamais purgée (contrat, §9, C3). La colonne est `not null` (`20261023:91`) : on ne peut pas la vider, il faut supprimer la ligne de la personne ; les photos gardent leur nom (`participant_id` passe à null, `20261023:144`) et les téléphones rattachés partent avec elle (`20261023:126`, cascade) |
| idem | aucune adresse, même masquée, ne reste au journal | **à décider** : `participant_retrouve` et voisins gardent l'adresse masquée (« l•••@audencia.com ») ; soit le passage la retire, soit la politique le dit |
| (politique, Q7) la preuve reste | le nom, la version et l'heure de l'accord restent sur chaque photo après l'effacement | **vrai** (`COLONNES_GARDEES`, `retention.ts:262`) ; la durée reste [À FIXER] |
| « Nous ne vous écrirons pas pour autre chose » | aucun mail ne part jamais à un participant | **vrai** : tous les mails des éditions partent à `responsable_email` (quatre appelants, voir la note du §13.3 de la politique). À garder vrai : une épreuve du harnais qui le vérifie serait utile |
| (la phrase sous le champ) | le champ d'adresse et sa phrase s'affichent | **dépend de la migration `20261023`, PAS appliquée** (`ETAT-PRODUCTION.md`, 20/10 fin d'après-midi) : sans elle, la page reprend l'ancien dépôt sans adresse |
| (le lien) « Comment Bellajour traite vos données » | la politique v4 avec sa section 13 est EN LIGNE avant le texte d'accord, en trois langues | **à faire** : le lien mènerait sinon à une politique qui ne parle pas des participants |
| (corbeille) | une photo supprimée part après 30 jours | **vrai si 20261023 est appliquée** : purge quotidienne après la relève (`relever/route.ts:162`, cron 7 h UTC), 500 photos au plus par passage |

## 5. Une remarque à porter à la relecture

Dans l'hypothèse A (Q8), Bellajour est le sous-traitant du client : la case du participant n'est
pas la base légale du traitement, que le client choisit. Elle reste utile (information avant
l'envoi, garantie des droits sur les photos, preuve horodatée), mais « J'accepte que Bellajour
utilise… » peut se lire comme un consentement, que le participant pourrait alors retirer à tout
moment. La relecture dira si la formule convient ou s'il faut écrire, par exemple, « J'ai compris
que… ». Rien n'est changé ici en attendant.
