# Envoyer la maquette complète par Canva : le process

Écrit le 17/09/2026, avant le tout premier envoi à un bêta-testeur. Réutilisable pour chaque
numéro. Tout ce qui est affirmé ici sur le site et les mails a été relu dans le code ce jour-là
(`scripts/mails-atelier.mjs`, `src/app/numero/[token]/`, `src/lib/atelier/`). Tout ce qui est
affirmé sur Canva vient de son centre d'aide (liens en fin de document) ; ce qui n'y est pas
écrit noir sur blanc est signalé comme non prouvé.

---

## 1. Ce que le client sait déjà quand il vient de payer

L'état du dossier est `payee`. Voici, source par source, ce qu'il a lu. La maquette Canva ne doit
ni le répéter, ni le contredire.

### Sur le site, avant même de déposer ses photos (`/magazine`, FAQ)

| Il a lu | Où |
|---|---|
| « Retouches sur la maquette, sans frais, avant l'impression » | bandeau produit |
| « Chez vous sous 10 jours après validation de la maquette » | bandeau produit et FAQ |
| « 3 jours ouvrés de fabrication, 3 à 7 jours d'acheminement » | FAQ « Je le reçois quand ? » |
| « À la main, page à page, dans l'atelier. Pas de gabarit automatique, pas de remplissage. Vous voyez la maquette complète avant l'impression. » | FAQ « Comment composez-vous ? » |

### Dans le questionnaire (`/composer`)

- « Vous la recevez sous 48 h. Gratuitement, sans engagement. » (la couverture)
- « Votre lien, le seul. Gardez-le. Il suit votre numéro jusqu'à la livraison. »

### Sur sa page, à l'étape couverture (`/numero`, état `apercu_pret`)

C'est l'étape où il a le plus appris, et **le vocabulaire qu'il connaît vient de là** :

- Il a vu une à trois couvertures, et il a cliqué **« Choisir cette couverture »** ou **« Sans
  préférence, je vous fais confiance »**. Le choix est journalisé (`couverture_choisie`, rang ou
  `indifferent`) et lisible sur la fiche admin du dossier.
- Il a vu la couverture **« À plat : quatrième, dos, première »**.
- Il a vu **« Une double page »** (ou « Les doubles pages »), avec cette phrase dessous :
  « Ces pages restent entièrement modifiables à la création de votre maquette. Aucune inquiétude. »
- Il a vu son bon de commande : « Votre numéro, N pages », la finition (mat ou brillant), les
  exemplaires, le pays, et « Votre numéro complet … après votre validation ».
- Il a coché : « Je reconnais que ce numéro est personnalisé et que mon droit de rétractation
  s'éteindra au moment où je validerai la maquette. Jusque-là, je peux demander le remboursement
  intégral. »
- Il a eu sous les yeux la feuille « Envie d'un ajustement ? » avec cinq motifs : *L'ambiance,
  les couleurs · Une photo à changer · La mise en page · Plus court, plus dense · Plus long, plus
  aéré*, et la phrase « Pas besoin d'écrire un mail ».

### Les mails reçus

| Code | Ce qu'il dit sur la suite |
|---|---|
| M0 | Accusé de dépôt. |
| M3 | « L'atelier a composé la couverture de votre numéro. Elle vous attend sur votre page, avec sa quatrième, une double page, sa pagination et son prix. » « Vous ne payez que si elle vous plaît. » |
| M3b (si relancé) | « Un détail à changer avant de vous décider ? Répondez à ce message, on ajuste sans frais. » |
| **M4, à la seconde du paiement** | « Votre numéro complet vous attend **sous trois jours ouvrés**. Vous le feuilletterez **en entier** avant qu'il ne parte à l'impression : **rien ne s'imprime sans votre accord**. » Pied : « Vous n'avez rien à faire d'ici là. Une question, une envie de changement ? Répondez simplement à ce message. » |
| Facture Stripe | Séparée, montant exact réglé. |

### Sa page, maintenant (`/numero`, état `payee`)

> Merci. Votre paiement est bien reçu. L'atelier compose maintenant votre numéro complet.
> Il vous attend ici **sous 3 jours ouvrés**, et vous serez prévenu par mail.
> Un détail à changer ? Répondez au mail, on ajuste sans frais.

### En résumé : les promesses déjà faites, à ne pas contredire

1. **Délai** : maquette complète sous 3 jours ouvrés après paiement (`DELAIS.payee`).
2. **Il voit tout** : « en entier », « page après page ».
3. **Rien ne s'imprime sans accord**, et retouches **sans frais** avant impression. Aucun nombre
   d'allers-retours n'a jamais été annoncé : ne pas en inventer un dans le Canva.
4. **Le lien `/numero` est son seul espace** : tout se passe là, les mails y renvoient.
5. **Sa couverture est choisie**. La lui représenter comme une question ouverte contredirait
   son geste. On peut la lui rappeler, pas la lui redemander.
6. **Il connaît déjà** les mots « première », « quatrième », « dos », « à plat », « double page ».

---

## 2. Ce qui part au moment où tu publies (à ne pas dupliquer)

Quand tu cliques **« Publier la maquette »** dans `/admin/atelier/<token>` (champs : *Lien Canva à
PARTAGER*, « Mode COMMENTAIRE uniquement. Jamais le lien d'édition. », et *PDF feuilletable,
facultatif*), deux choses se produisent sans toi :

**M5 part** (une seule fois par dossier, verrou `mails_envoyes`) :

> Objet : « {Titre}, la maquette complète »
> « Chaque page est en place. Prenez le temps de le feuilleter, page après page, et dites-nous si
> tout vous va. » Carte : N pages composées · date limite (J+7). « Une correction à demander ?
> Écrivez-la dans le document, puis dites-le nous depuis votre page : nous repassons dessus. »
> Bouton « Voir ma maquette ». Pied : « Sans réponse de votre part d'ici le {date}, nous lançons
> l'impression telle quelle. »

**Sa page bascule** (état `maquette_prete`) :

> « {Titre}, en entier. Feuilletez, puis dites-nous si on imprime. Un détail à changer ?
> Écrivez-le dans le Canva, on repasse dessus. »
> [PDF feuilleté dans la page, si fourni] · « Ouvrir le PDF en grand » · « Ouvrir le Canva pour commenter »
> [ Tout est bon, imprimez ] · « J'ai noté des retouches dans le Canva »
> « Sans réponse d'ici le {date}, nous lançons l'impression telle quelle. »

Après le clic « J'ai noté des retouches » : « C'est noté, l'atelier repasse dessus. Rien ne partira
à l'impression tant que la maquette corrigée ne vous a pas été représentée. »

**Trois conséquences pour le Canva :**

- Le Canva n'a **pas** à annoncer la date limite : elle est sur la page et dans M5, calculée
  (`etat_maj_le` + 7 jours). Une date tapée à la main dans le Canva finirait par être fausse.
  Le Canva dit « la date indiquée sur votre page ».
- Le Canva **doit** dire de cliquer « J'ai noté des retouches dans le Canva » après avoir commenté.
  Sans ce clic, l'atelier ne sait pas qu'il a commenté, et l'auto-validation à J+7 imprime
  par-dessus ses demandes. C'est le point le plus important de la page mode d'emploi.
- **Republier après retouches ne renvoie aucun mail** (M5 est déjà parti). Le mail de « voici la
  version corrigée » est **manuel**, en réponse au fil M5. Le wording est en §5.

---

## 3. Canva : les deux questions tranchées

### Peut-il voir les pages masquées ?

Canva a bien une fonction « Masquer la page » (clic droit sur une vignette ; la numérotation
automatique saute les pages masquées). Mais **Canva écrit lui-même que ce n'est pas une
protection** : « Hidden content (cropped images, hidden pages) becomes visible if the design is
copied », et « people may be able to access content that isn't immediately visible, including
hidden content, cropped content, and presenter notes. Content from previous revisions may also be
accessible. » Sa recommandation officielle avant de partager : retirer les pages masquées et les
notes, **faire une copie** (la copie ne porte pas l'historique des révisions), et partager la copie.

Ce que je n'ai pas pu prouver dans la doc : si un accès « peut commenter » permet ou non de
télécharger ou de copier le fichier. Pour un accès « peut voir », Canva indique que l'export et la
copie sont possibles. **On considère donc qu'un commentateur peut copier**, et qu'une page masquée
est visible pour qui veut la voir.

**Décision :** on ne masque rien dans le fichier partagé. Le fichier partagé ne contient que ce
que le client peut voir. Les variantes, essais, photos écartées et notes vivent dans le fichier de
travail, qui reste privé. (Détail en §4, étape 2.)

### Le mode « Commenter » est-il adapté ? Que peut-il faire ?

Oui, c'est le bon mode, et c'est déjà la règle du PRD §11 et du formulaire admin.

Ce qu'une personne avec le lien « peut commenter » **peut** faire :
- ouvrir le fichier, toutes les pages, zoomer, lancer le mode présentation ;
- voir les commentaires existants **sans compte** ;
- **avec un compte Canva (gratuit) connecté** : ajouter un commentaire ancré sur un élément, un
  texte ou une page ; mettre en forme (gras, italique, liste, lien) ; répondre ; réagir avec un
  emoji ; marquer un commentaire comme résolu ; copier le lien d'un commentaire.

Ce qu'elle **ne peut pas** faire :
- déplacer, modifier, supprimer quoi que ce soit ; ajouter ou retirer une page ; téléverser ;
- changer les droits du lien ou inviter quelqu'un ;
- supprimer les commentaires des autres (seul le propriétaire le peut).

**La friction à annoncer** : pour écrire un commentaire, il faut être connecté à un compte Canva.
Sans compte, il voit tout mais ne peut rien dire. La page mode d'emploi le dit, et donne le
repli : répondre au mail.

Comment limiter ses actions, dans l'ordre d'importance :
1. Lien en **« Peut commenter »**, jamais « Peut modifier ». Même en commentaire il ne peut rien
   casser : verrouiller les éléments ne sert donc à rien ici, ce n'est utile qu'en mode édition.
2. **Un fichier Canva par numéro, jamais réutilisé** : le fil de commentaires (résolus compris)
   reste lisible par quiconque a le lien.
3. Aucun **lien public de visualisation** ni **lien modèle** sur ce fichier : ce sont d'autres
   canaux, non couverts par le lien commentaire.
4. Pas de notes de présentation dans le fichier partagé.
5. Après validation, **repasser le fichier en « Vous seul pouvez accéder »** : M6 promet « plus
   rien ne peut être modifié », et un fil de commentaires ouvert après validation créerait
   l'attente inverse.

### Les réglages, en une liste

| Réglage | Valeur |
|---|---|
| Niveau d'accès | Toute personne disposant du lien |
| Autorisation | Peut commenter |
| Lien public de visualisation | Aucun |
| Lien modèle | Aucun |
| Notes de présentation | Aucune |
| Pages masquées | Aucune (supprimées de la copie partagée) |
| Après « Tout est bon, imprimez » | Vous seul pouvez accéder |

Pourquoi « toute personne disposant du lien » plutôt qu'une invitation par email : l'invitation
oblige le client à se connecter avec **exactement** cette adresse, et une adresse Canva différente
de l'adresse Bellajour est le cas courant. Le lien n'est de toute façon exposé que sur sa page
`/numero`, elle-même protégée par le token.

---

## 4. Le process, étape par étape

### Étape 1 : préparer le contenu (fichier de travail, privé)

1. Relire la fiche admin du dossier : titre, N pages (gelé à l'aperçu), **couverture choisie**
   (rang, ou « je vous fais confiance »), finition, et les éventuels ajustements demandés à
   l'étape couverture (journal `evenements`, motifs de la feuille d'ajustement).
2. Composer les doubles pages dans le fichier de travail. Y garder tout ce qu'on veut : essais,
   variantes, pages masquées, notes.

### Étape 2 : fabriquer la copie client

1. **Fichier → Faire une copie.** La renommer `{Titre} · Maquette` (le fichier de travail garde
   son nom et reste privé).
2. Dans la copie : supprimer les pages masquées (pas les masquer, les supprimer), les notes, les
   pages d'essai. Ce qui reste est exactement ce que le client verra.
3. Ordonner les pages ainsi :

| Page Canva | Contenu | Repère visuel |
|---|---|---|
| 1 | **Mode d'emploi** (texte en §5, illustré) | |
| 2 | Couverture retenue, **à plat : quatrième, dos, première** | pastille « Votre choix » (ou « Notre choix » s'il a dit « je vous fais confiance ») |
| 3 | L'autre couverture, à plat | pastille « L'autre proposition » |
| 4 → N | Les doubles pages, dans l'ordre du magazine | numéro de double page en marge : « pages 2 et 3 », « pages 4 et 5 »… |

Pourquoi les deux couvertures et pas une seule : le client les a vues toutes les deux et en a
retenu une. Montrer seulement la retenue le laisserait croire que l'autre est perdue ; les montrer
sans repère rouvrirait une question qu'il a déjà tranchée. La pastille rappelle son geste, elle ne
le lui redemande pas.

Pourquoi la couverture reste « à plat » : c'est le mot et l'image qu'il a vus sur `/numero`. Un
fichier Canva n'a qu'un seul format de page ; la couverture à plat (avec son dos) est un peu plus
large qu'une double page. La poser centrée sur une page au format double page, légèrement
réduite, avec la mention « à plat, échelle réduite ».

4. Poser la pastille sur la page 2 depuis un élément partagé à tous les numéros (même forme, même
   mot) : c'est le seul repère « produit » du document, il doit se ressembler d'un client à l'autre.

### Étape 3 : partager

1. Partager → Toute personne disposant du lien → **Peut commenter** → Copier le lien.
2. Vérifier en navigation privée : le lien s'ouvre, aucun bouton de modification, toutes les pages
   visibles, aucune page masquée, aucune note.
3. Facultatif mais recommandé : exporter la copie en **PDF standard** (pas « impression ») et le
   déposer pour le champ « PDF feuilletable ». Sans PDF, la page `/numero` n'a que le lien Canva ;
   avec, le client feuillette dans la page sans quitter Bellajour, et le Canva ne sert qu'à
   commenter. Pour un premier envoi, le PDF est le filet si le client bloque sur Canva.

### Étape 4 : publier (c'est ce qui prévient le client)

1. `/admin/atelier/<token>` → « Publier la maquette » → coller le lien commentaire (+ l'URL du PDF).
2. M5 part, la page bascule, l'échéance J+7 démarre. **Ne pas envoyer un second mail** qui
   répète M5. Pour un bêta-testeur, un message personnel court peut suivre sur le canal habituel
   (texte en §5) : il ajoute de la chaleur et le point sur le compte Canva, rien d'autre.

### Étape 5 : la boucle de retouches

1. Le client commente dans le Canva, puis clique « J'ai noté des retouches dans le Canva ».
   Si des commentaires arrivent **sans** le clic (ça arrivera), c'est à l'atelier de poser la
   suspension : ne pas laisser l'échéance J+7 courir sur un dossier commenté.
2. Répondre à chaque commentaire **dans le Canva** (accusé, en une ligne : texte en §5), le
   corriger dans **la copie client** directement (le fichier de travail n'est plus la référence
   après le partage : les commentaires et la maquette doivent rester au même endroit), puis
   marquer le commentaire résolu.
3. Republier depuis l'admin (même écran, même lien). Ça lève la suspension et redémarre J+7.
   **Aucun mail ne part** : écrire le mail de version corrigée à la main, en réponse au fil M5
   (texte en §5).
4. Le client clique « Tout est bon, imprimez ». M6 part tout seul.

### Étape 6 : après validation

Repasser le fichier en « Vous seul pouvez accéder ». Exporter le PDF d'impression depuis la copie
client (c'est elle qui porte les corrections).

---

## 5. Le wording

Règles de forme, les mêmes que pour les mails : vouvoiement, aucun tiret cadratin ni
demi-cadratin, jamais « Cliquez ici », masculin générique. Les mots du site : première, quatrième,
dos, à plat, double page, l'atelier, votre page.

### 5a. La page « Mode d'emploi » (page 1 du Canva)

Trois blocs courts, chacun avec un picto. Rien d'autre sur la page.

**Titre**
> Votre numéro, en entier.

**Bloc 1 · Comment lire (picto : magazine ouvert, pli au centre)**
> Chaque page de ce document est une double page : le magazine ouvert, la page de gauche et la
> page de droite, avec le pli au milieu. Les numéros en marge sont ceux du magazine imprimé.
> Les deux premières pages montrent la couverture à plat : quatrième, dos, première. Celle qui
> porte la pastille est celle que vous avez retenue ; l'autre reste là si vous changez d'avis.

**Bloc 2 · Comment demander un changement (picto : bulle de commentaire)**
> Un mot à ajouter, une photo à remplacer, une page à revoir : sélectionnez l'endroit, puis
> « Commenter ». Écrivez ce que vous voulez y voir, l'atelier s'occupe du reste. Pour commenter,
> Canva demande un compte gratuit ; si vous préférez, répondez simplement au mail.

**Bloc 3 · Puis dites-le nous (picto : le bouton de votre page)**
> Une fois vos commentaires écrits, retournez sur votre page et appuyez sur « J'ai noté des
> retouches dans le Canva ». C'est ce geste qui nous prévient : rien ne part à l'impression tant
> que la version corrigée ne vous a pas été représentée. Si tout vous va, « Tout est bon,
> imprimez » suffit. Sans nouvelle de votre part, l'impression part à la date indiquée sur votre
> page.

**Pastilles**
- Page 2 : « Votre choix » (ou « Notre choix » si « je vous fais confiance »)
- Page 3 : « L'autre proposition »

Ce que la page ne dit **pas**, et pourquoi : pas de date (elle est sur la page, calculée) ; pas
de nombre d'allers-retours (jamais annoncé, retouches « sans frais » promises sans limite) ; pas
de « double page = 2 pages du prix » (le prix est gelé, N pages connu) ; pas de délai de
réimpression ni de livraison (M6 et la page s'en chargent).

### 5b. Message personnel au bêta-testeur, juste après la publication (facultatif)

En réponse au fil de mail, ou sur le canal habituel. Court : M5 vient de tout dire.

> Bonjour {Prénom},
> Le mail vient de partir : votre numéro est composé, en entier. Ouvrez-le depuis votre page.
> La première page du document explique comment le lire et comment nous dire ce que vous voulez
> changer. Un détail pratique : pour écrire un commentaire dans Canva, il faut un compte gratuit,
> une minute à créer. Si ça vous embête, répondez simplement à ce message, ça marche aussi.
> Vous êtes parmi les tout premiers à recevoir un numéro : tout ce qui vous semble peu clair
> nous intéresse autant que les corrections elles-mêmes.
> {Signature}

### 5c. Réponse à un commentaire, dans le Canva

> Bien reçu, on s'en occupe. Vous verrez la correction dans la version suivante.

Puis, une fois corrigé : marquer résolu. Pas de réponse longue dans le Canva ; le fil de mail
reste le lieu de la conversation.

### 5d. Mail de version corrigée (manuel, après republication)

> Objet : {Titre}, la version corrigée
> Bonjour {Prénom},
> Vos corrections sont faites : {une ligne par changement, avec la page}. La maquette mise à jour
> est sur votre page, avec les mêmes boutons : « Tout est bon, imprimez » si tout vous va, ou de
> nouveaux commentaires dans le Canva puis « J'ai noté des retouches ».
> Sans nouvelle de votre part, l'impression part à la date indiquée sur votre page.
> {Signature}

---

## 6. Ce qui reste à trancher par Mathias

1. **Le compte Canva obligatoire pour commenter.** C'est la friction n°1 pour un client
   Instagram sur iPhone. Le process donne le repli « répondez au mail ». Si ça bloque trop, la
   solution est côté produit (T-089 : visionneuse `/numero` avec réactions), pas côté Canva.
2. **Le PDF feuilletable** : le déposer systématiquement, ou seulement quand le client bloque ?
   Recommandation : systématiquement, c'est le filet.
3. **Le mot des pastilles** (« Votre choix » / « L'autre proposition ») : à valider une fois, puis
   figé pour tous les numéros.
4. **« Prévenue »** au féminin sur la page `payee` : petite correction de copy à faire, hors de
   ce process.

---

## Sources Canva (relues le 17/09/2026)

- [Sharing designs via email or links](https://www.canva.com/help/share-via-link-or-email/) :
  niveaux d'accès, autorisations, avertissement sur le contenu masqué et la copie à partager.
- [Share your Canva design and collaborate with anyone](https://www.canva.com/help/collaborate-with-anyone/) :
  ce qu'un invité peut et ne peut pas faire, compte requis pour commenter.
- [Share designs with your team](https://www.canva.com/help/team-sharing/) :
  « Hidden content (cropped images, hidden pages) becomes visible if the design is copied ».
- [Add, delete, and resolve comments](https://www.canva.com/help/comments/) :
  ancrage, mise en forme, résolution, réactions, liens de commentaire, suppression réservée au propriétaire.
- [Add, duplicate, and delete pages](https://www.canva.com/help/manage-pages/) :
  numérotation automatique qui saute les pages masquées.
