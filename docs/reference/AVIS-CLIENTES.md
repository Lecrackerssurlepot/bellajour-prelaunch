# Les avis clientes — le plan complet

Écrit le 27/08/2026. Trois questions posées : **comment l'intégrer à la page produit**,
**comment le rendre pertinent pour le SEO**, **comment le demander stratégiquement**.
Elles n'ont pas la même difficulté. La troisième décide de tout : sans avis, il n'y a
ni page à remplir ni balisage à poser. Le reste est de la plomberie.

---

## 0. Ce qui existe déjà, et qu'il ne faut pas refaire

| Brique | Où | Ce qu'elle apporte au chantier |
|---|---|---|
| Le lien privé du numéro | `/numero/[token]`, token 32 car. | **La preuve d'achat, gratuite.** Qui détient le lien a commandé. C'est ce qui rend nos avis « vérifiés » au sens de la directive Omnibus, sans compte ni mot de passe. |
| L'état `livree` (8) | `transitions.ts`, posé par le webhook Cloudprinter `ItemShipped`/livraison | **Le signal de départ.** On sait quand le colis est arrivé, donc quand demander. |
| La relève quotidienne | `/api/atelier/mails/relever`, 7 h UTC | La machine qui enverra la demande, et sa relance. Rien de neuf à bâtir. |
| `codesPour` + `mails_envoyes` | `src/lib/atelier/mails.ts` | Verrou anti double-envoi et **garde-fou de chaîne** (un mail ne part que si son prédécesseur est parti). Un mail d'avis y entre comme les autres. |
| `consent_communication` | colonne + `ConsentCommunication.tsx` | La case « montrer un extrait de mon numéro ». Le consentement image existe déjà, séparé du reste. |
| `Avis.tsx` | `/lancement` (noindex) | Trois témoignages **en dur**, sans étoile ni moyenne, avec la règle écrite en commentaire : rien tant qu'on est sous 30 avis, jamais d'`AggregateRating`. À reprendre (§9, D5). |
| `JSON_LD` Product | `(atelier)/page.tsx` | Le socle du balisage. **Il contient un bug** à corriger avant d'y greffer quoi que ce soit (§4.1). |

**La PDP, ici, c'est `/`.** La homepage de l'Atelier est la seule page indexée qui vend.
C'est donc elle qui portera les avis visibles et le balisage. Pas `/lancement` (noindex),
pas `/preventes` (fermée, noindex).

---

## 1. La décision de fond : on note quoi, exactement ?

**On note le numéro, jamais la maison.** Ce n'est pas une nuance de vocabulaire, c'est
la frontière entre un balisage éligible et un balisage interdit : Google exclut
explicitement du résultat enrichi les avis qu'une entité publie **sur elle-même** quand
ils sont balisés en `Organization` ou `LocalBusiness`. Les avis sur un **`Product`**
vendu par le site, eux, restent éligibles. Toute la stratégie tient dans ce fil : la
note porte sur « mon numéro », l'objet imprimé, pas sur « Bellajour, super boîte ».

**Une note, une phrase, une photo. Pas de grille multi-critères.**
Chaque champ supplémentaire coûte des points de taux de réponse, et une note « qualité
d'impression 4,2 / mise en page 4,6 / délai 4,9 » ne se balise pas mieux et ne se lit pas
plus. Ce qu'on demande :

1. **Une note de 1 à 5** (obligatoire, un clic) ;
2. **Deux lignes libres** (facultatif) ;
3. **Une photo du numéro entre ses mains** (facultatif, et c'est le champ le plus rentable : les fiches produit avec photos clientes convertissent nettement mieux) ;
4. **Le prénom** (pré-rempli depuis le dossier) et **la case de publication**.

**Une quatrième question, PRIVÉE, jamais publiée** : « qu'est-ce qui aurait pu être
mieux ? ». Elle nourrit le produit. ⚠️ Elle arrive **après** l'envoi de l'avis public,
jamais avant : poser d'abord une question de satisfaction pour n'orienter vers l'avis
public que les contentes, c'est du *review gating*. C'est interdit par Google, par
Trustpilot, et c'est une pratique commerciale trompeuse au sens du droit français.

---

## 2. Le demander : le moment, le canal, le geste

### 2.1 Le moment

Le pic d'émotion de ce produit est double : la **découverte de la maquette** (état 4) et
l'**ouverture du colis** (état 8). Le premier ne peut pas produire d'avis — elle n'a pas
encore l'objet. Le second est le bon, et il faut le laisser retomber un peu : les données
publiées sur les demandes d'avis convergent vers **3 à 7 jours après la livraison**, le
temps de l'avoir montré à quelqu'un.

Séquence proposée, dans la machine existante (`codesPour`, état `livree`) :

| Quand | Code | Ce que ça dit | Chaîné sur |
|---|---|---|---|
| Livraison + 5 j | **M10 · l'avis** | « Il vous ressemble ? » | M7 |
| Livraison + 12 j, **si aucun avis** | **M10b · la relance** | Une phrase, un rappel, et c'est tout | M10 |
| Livraison + 15 j | **M8 · le prochain moment** *(déplacé)* | L'invitation à recomposer | M10 |

⚠️ **M8 part aujourd'hui à J+3 et demande un rachat.** Demander un rachat avant d'avoir
demandé un avis, c'est réclamer le gros geste avant le petit. On inverse : l'avis
d'abord, l'invitation ensuite. Le garde-fou de chaîne rend l'ordre mécanique.

**Deux sollicitations, pas trois.** Après M10b, on ne redemande jamais. Une relance unique
fait passer le taux de réponse d'environ moitié en plus ; une troisième abîme la relation
pour un rendement nul.

### 2.2 Le canal

- **Le mail** (Brevo, templates versionnés dans `scripts/mails-atelier.mjs`).
- **La page du numéro**, en permanence dès l'état 8 : c'est la page qu'elle rouvre pendant
  toute la vie du numéro, et le lien est rappelé en pied de tous les mails. Un bloc
  « Votre avis » y reste jusqu'à ce qu'elle en dépose un.
- **Pas de SMS.** Le téléphone est collecté pour le transporteur (obligatoire chez
  Cloudprinter), pas pour de la sollicitation. L'utiliser pour ça serait un détournement
  de finalité au sens du RGPD.

### 2.3 Où elle dépose son avis, exactement

**Sur `/numero/<token>`, la page qu'elle connaît déjà.** Aucun compte, aucun autre site,
aucun mot de passe : le lien qu'elle a rouvert pendant tout le parcours devient, à l'état
8, la page où elle donne son avis. Le bloc « Votre avis » s'y installe en tête et y reste
tant qu'elle n'en a pas déposé un. Le mail ne fait que l'y emmener.

⚠️ **Le clic depuis le mail ne peut PAS écrire en base.** Un lien contenu dans un mail est
visité par des robots — antivirus d'entreprise, prélecture des messageries — qui suivent
les URL sans que personne n'ait rien cliqué. Une route qui enregistrerait une note sur un
simple `GET` récolterait des cinq étoiles fantômes, et le balisage porterait une moyenne
fabriquée par des scanners. **L'étoile du mail pré-remplit, elle ne valide pas.**

Le geste, en deux temps :

1. **L'étoile du mail** mène à `/numero/<token>?note=4#avis` : la page s'ouvre, la note est
   déjà sélectionnée, le bouton **Envoyer** est immédiatement sous le doigt. Un tap, l'avis
   existe. C'est aussi court qu'un geste honnête peut l'être.
2. **Ce qui reste est facultatif et se propose après** : deux lignes de texte, puis une
   photo, chacune enregistrée séparément. Une cliente qui s'arrête après la note a quand
   même donné sa note.

Le champ texte et la photo passent par la même route en `PATCH` : l'avis est une ligne qui
se complète, jamais un formulaire à remplir d'un bloc.

### 2.4 Ce qu'on ne fait jamais

- **Aucune contrepartie.** Depuis le 24/07/2026, Google interdit explicitement les avis
  incentivés non divulgués dans la page **et dans le balisage** ; le droit français impose
  de déclarer toute contrepartie ; et conditionner une remise à un avis *positif* est une
  pratique trompeuse. Le seul « cadeau » qu'on offre, c'est de **publier son avis avec son
  prénom et la couverture de son numéro** : ce n'est pas un avantage matériel, c'est
  l'objet même du geste. C'est aussi, pour cette marque, le meilleur argument.
- **Aucun tri avant publication selon la note.** Voir §1.
- **Aucun avis sollicité auprès de proches**, ni importé d'ailleurs.

### 2.5 Le texte de M10 (brouillon)

> **Objet** : Il vous ressemble ?
> **Préheader** : Deux lignes, et vous aidez la prochaine à oser.
>
> **Il vous ressemble ?**
>
> {PRENOM}, {TITRE} est arrivé chez vous il y a quelques jours. Nous aimerions savoir ce
> que vous en avez pensé. Une note, et deux lignes si le cœur vous en dit.
>
> [★ ★ ★ ★ ★]
>
> **Donner mon avis**
>
> Nous publions tous les avis, y compris ceux qui piquent. Si quelque chose ne va pas,
> c'est ici aussi qu'il faut le dire.

⚠️ Aucun tiret cadratin ni demi-cadratin dans les textes de mails (consigne, vérifiée par
`verifierForme`). Aucune entité HTML dans l'objet.

---

## 3. L'intégrer à la page produit

### 3.1 Où, sur `/`

- **Bloc principal après `S2Collection`** : la preuve visuelle du produit, puis la preuve
  sociale, puis la méthode. On ne met pas les avis avant d'avoir montré l'objet.
- **Rappel court dans `S4Final`**, à hauteur du CTA : la note, le nombre d'avis, un lien
  vers `/avis`. C'est là que le doute se lève ou tue la commande.

### 3.2 Ce que porte chaque carte

Note · texte · **prénom** · occasion · **date de l'expérience** (mois de livraison) ·
photo si présente · mention **« Achat vérifié »** · réponse de l'atelier s'il y en a une.

La date et la mention ne sont pas décoratives : les deux sont des obligations légales
(§5), et la fraîcheur est devenue un critère de confiance mesurable.

### 3.3 La page `/avis`

Tous les avis, du plus récent au plus ancien, paginés, **plus la charte de transparence**
(§5.1). Indexable, ajoutée au `sitemap.ts`, liée depuis `/` et depuis le footer.
C'est la page qui absorbe le volume de texte sans alourdir la homepage, et c'est elle
qui répond à l'obligation d'affichage des modalités.

### 3.4 Le seuil d'affichage

**Tant qu'on est sous le seuil** : les avis s'affichent **sans étoiles, sans moyenne,
sans compteur**, comme des témoignages. Aucun balisage `aggregateRating`.
**Au-dessus** : étoiles, moyenne, compteur, balisage.

La règle écrite aujourd'hui dans `Avis.tsx` fixe ce seuil à **30**. C'est prudent au point
d'être coûteux : à 4 ou 5 numéros par semaine et 30 % de réponse, 30 avis, c'est
**cinq à six mois** sans une seule étoile dans Google. Or l'effet de conversion documenté
est **déjà massif à partir de 5 avis** (Spiegel Research Center, Northwestern : +270 % de
conversion sur les fiches avec avis, et davantage sur les produits à panier élevé).
**Recommandation : 10.** Assez pour qu'une moyenne veuille dire quelque chose, assez tôt
pour ne pas laisser six mois de trafic sans preuve. → décision **D3** (§10).

### 3.6 Comment la note et le compteur montent tout seuls sur `/`

Un seul calcul, **`getAvis()`**, côté serveur : il lit les avis **publiés**, rend
`{ moyenne, nombre, avis[], afficherNote }` et sert tout le monde — le bloc sur `/`, le
rappel près du CTA, la page `/avis`, et le JSON-LD. Une seule source, donc aucune
divergence possible entre l'étoile affichée et l'étoile balisée.

Reste la vraie difficulté : **`/` est aujourd'hui une page statique**, fabriquée une fois
au déploiement, qui ne parle à aucune base. Trois façons de la faire bouger, une seule
bonne :

| Option | Effet | Verdict |
|---|---|---|
| `export const dynamic = 'force-dynamic'` | une requête Supabase **à chaque visite** | ❌ c'est la page qui reçoit tout le trafic Instagram |
| `export const revalidate = 3600` | la page se refait toute seule, au plus une fois par heure, à la première visite après expiration | ✅ le filet |
| `revalidatePath('/')` à la publication d'un avis | la page se refait **dans la seconde** où vous publiez | ✅ l'effet immédiat |

**Les deux dernières ensemble.** Coût : une requête base par heure au pire, zéro pour
99,9 % des visiteuses. La moyenne à l'écran est donc automatique, mais elle ne bouge que
sur des avis **publiés** : rien n'apparaît sans votre clic de modération, et c'est voulu.

**Le seuil se gère au même endroit** : sous le seuil, `getAvis()` renvoie
`afficherNote: false` et la page rend les avis sans étoile ni moyenne, le JSON-LD sans
`aggregateRating`. Au N-ième avis publié, tout apparaît d'un coup, **sans redéploiement**.

### 3.5 Ne pas viser 5,0

Une moyenne pleine se lit comme un tri. **4,6 à 4,9, avec des 4 et un 3 visibles, convertit
mieux qu'un mur de 5.** Il faut donc publier les avis moyens, et surtout y répondre : la
réponse de l'atelier sous un avis tiède est le contenu le plus persuasif de la page.

---

## 4. Le rendre pertinent pour le SEO

### 4.1 D'abord, corriger le balisage existant

`(atelier)/page.tsx` déclare un `Offer` qui porte `lowPrice` et `highPrice`. **Ces deux
propriétés n'existent pas sur `Offer`** : elles appartiennent à `AggregateOffer`. En
l'état, Google ignore la fourchette au mieux, invalide l'offre au pire. À reprendre avant
d'y greffer une note :

- `offers` → `AggregateOffer` avec `lowPrice: 30`, `highPrice: 45`, `priceCurrency: EUR`, `offerCount: 3`, `availability`, `url` ;
- ajouter `image` (une couverture réelle), `url`, `brand` (déjà là), et à terme `hasMerchantReturnPolicy` / `shippingDetails`, qui enrichissent la fiche marchande.

### 4.2 Puis greffer la note, quand le seuil est atteint

Sur `/` uniquement, dans le même nœud `Product` :
`aggregateRating` (`ratingValue`, `ratingCount`, `bestRating: 5`, `worstRating: 1`) **plus
les derniers `review`** (`author`, `reviewRating`, `datePublished`, `reviewBody`).

Trois règles à ne pas enfreindre :
1. **Les avis balisés doivent être visibles sur la page qui les balise.** Baliser sur `/` une moyenne dont les avis ne vivent que sur `/avis` est une infraction directe.
2. **Ne jamais agréger des avis venus d'ailleurs** (Trustpilot, Instagram) dans notre `aggregateRating`. Interdit explicitement.
3. **Jamais de note sur un nœud `Organization` ou `LocalBusiness`.** Inéligible, et c'est le genre de balisage qui attire une action manuelle.

Pas de balisage sur `/avis` : une seule entité `Product` notée, sur la page canonique.
Surveiller ensuite le rapport « Extraits d'avis » dans la Search Console — c'est le seul
endroit qui dit si Google a accepté.

### 4.3 Le vrai gain SEO n'est pas l'étoile

L'étoile fait monter le taux de clic. Le **texte** fait exister la page. Chaque avis
apporte du vocabulaire que nous n'écririons jamais nous-mêmes : « album de mon road trip »,
« cadeau pour les 30 ans de ma sœur », « les photos de la maternité ». C'est du contenu
frais, unique, et rédigé dans les mots des requêtes.

**Levier différé, mais le plus gros** : l'écran 1 du composeur collecte déjà l'occasion en
texte libre (« Un festival », « Un road trip », « Un été »…). Une fois une trentaine
d'avis rangés par occasion, ils deviennent la matière de pages d'atterrissage par moment
(`/album-photo-voyage`, `/album-photo-anniversaire`), chacune avec ses propres avis. C'est
là que se gagne la longue traîne, pas sur la homepage.

### 4.4 Le SEO qui n'est plus du SEO : les réponses des IA

Les plateformes d'avis sont devenues une source de premier plan pour les moteurs de
réponse : elles sont citées dans une part importante des AI Overviews, et Perplexity
s'appuie sur des avis dans la quasi-totalité de ses réponses commerciales. La fraîcheur y
pèse encore plus qu'ailleurs — **un flux régulier de 5 à 10 avis par mois vaut mieux que
200 avis d'il y a deux ans**.

Conséquence pratique : nos avis sur notre site servent Google ; une présence sur **une**
plateforme tierce sert les IA et les requêtes de marque (« Bellajour avis »), qui sont la
dernière chose qu'une prospect tape avant de payer 30 €. Voir §7.

---

## 5. Le droit — la partie qui coûte cher

Deux régimes se cumulent, et être conforme à l'un ne suffit pas. La sanction de la
pratique commerciale trompeuse va jusqu'à **300 000 € et deux ans**, et la DGCCRF contrôle
le sujet activement.

⚠️ **Nos CGV sont de droit portugais, ça ne change rien ici.** Le règlement Rome I (art. 6)
laisse au consommateur français la protection impérative de son pays. Les obligations
ci-dessous s'appliquent.

### 5.1 La charte de transparence (art. L111-7-2 c. conso. + décret 2017-1436)

Une section sur `/avis`, huit points, à écrire noir sur blanc :

1. **Existence et description du contrôle** → « oui : seule la détentrice du lien privé d'un numéro livré peut déposer un avis ; nous ne vérifions rien d'autre. »
2. **Date de publication et date de l'expérience** → affichées sur chaque avis.
3. **Critères de classement** → « du plus récent au plus ancien, par défaut. »
4. **Contrepartie** → « aucune. »
5. **Délai maximal de publication** → « cinq jours ouvrés. »
6. **Durée de conservation** → à fixer (proposition : sans limite, retrait sur demande).
7. **Motifs de refus**, et leur communication à l'auteur.
8. **Un moyen gratuit de signaler un avis.**

### 5.2 Directive Omnibus

Obligation de dire **si** et **comment** on s'assure que les avis viennent de vraies
acheteuses. Notre réponse est bonne et rare : **par construction** — l'avis se dépose
depuis le lien privé d'un numéro livré, il n'y a pas d'autre porte. C'est un argument
commercial autant qu'une mention légale, à afficher (« Achat vérifié ») plutôt qu'à cacher
dans une page.

### 5.3 RGPD

Le prénom, le texte et la photo sont des données personnelles publiées. Base légale :
**consentement**, donc case décochée par défaut, distincte de tout le reste, retirable.
Retrait = dépublication sous 72 h. À ajouter à la politique de confidentialité (finalité,
durée, droits). La case existante `consent_communication` couvre l'extrait du numéro, pas
l'avis : **deux consentements distincts**, ne pas les fusionner.

### 5.4 Google, depuis le 24/07/2026

Interdiction explicite des faux avis **et** des avis incentivés non divulgués, dans la
page comme dans le balisage. Conséquence directe sur notre existant : **si les albums des
bêta-testeuses ont été offerts, leurs témoignages sont des avis incentivés.** Ils peuvent
rester à l'écran, mais alors étiquetés (« bêta-testeuse, numéro offert »), **hors de la
moyenne et hors du balisage**. Voir D5.

---

## 6. La modération, et les avis qui piquent

- **On ne modifie jamais un texte.** On publie, ou on refuse avec un motif, et le motif
  part à l'auteure. Corriger l'orthographe d'un avis, c'est déjà l'altérer.
- **Motifs de refus légitimes** : injure, données personnelles d'un tiers, hors sujet,
  contenu manifestement faux. Rien d'autre. Pas « trop négatif ».
- **Un avis négatif se publie et se répond**, publiquement, sous l'avis. Une réponse
  sobre, factuelle, qui dit ce qu'on a fait. C'est le contenu qui convertit le mieux.
- **Écran `/admin/atelier/avis`** : file d'attente, actions armées en deux temps comme le
  reste de l'Atelier, publication et refus tracés dans `evenements`.
- **Le filet en amont existe déjà** : M8 dit « si quelque chose ne va pas, répondez à ce
  message ». On le garde dans M10. Ce n'est pas du gating tant que le lien vers l'avis
  public est offert à tout le monde, dans le même mail, sans condition.

---

## 7. Les plateformes tierces

| Plateforme | Verdict | Pourquoi |
|---|---|---|
| **Nos avis, chez nous** | **Le socle, tout de suite** | Gratuit, vérifié par construction, balisable, et c'est nous qui possédons la donnée. |
| **Trustpilot (offre gratuite)** | **À ouvrir au lancement** | Sert les requêtes de marque et la citation par les IA. ⚠️ Ne jamais réinjecter ces avis dans notre `aggregateRating`. |
| **Google Business Profile** | À évaluer, sans y compter | Pensé pour un établissement recevant du public. Entité portugaise, pas de boutique : éligibilité douteuse. Ne pas forcer. |
| **Avis Vérifiés / Skeepers (NF Z74-501)** | **Pas maintenant** | ~1 500 €/an. Utile seulement pour les *Google Seller Ratings*, qui exigent ~100 avis sur 12 mois et par pays, et ne servent qu'avec des campagnes Google Ads. À revoir si les Ads démarrent. |
| **Instagram** | Complémentaire | Les stories des clientes sont de l'UGC, pas des avis. À republier avec autorisation écrite, sans jamais les compter comme des avis. |

---

## 8. Ce qu'on mesure

| Indicateur | Cible de départ |
|---|---|
| Taux de réponse à M10 (+ M10b) | **25 à 35 %** — hors norme pour du e-commerce (5 à 8 %), mais notre mail est nominatif, l'objet est émotionnel et le lien est déjà familier. |
| Délai médian livraison → avis | < 8 jours |
| Part d'avis avec photo | > 25 % |
| Note moyenne | 4,6 à 4,9 (viser 5,0 est un mauvais signe) |
| Flux mensuel | 5 à 10 avis / mois, en continu |
| Avis refusés | < 5 %, chacun motivé |
| Search Console | apparition du rapport « Extraits d'avis » sous 3 semaines après le balisage |
| Conversion `/` → `/composer` | comparer avant / après le bloc avis |

---

## 9. Le découpage

### Lot A — la mécanique (avant le lancement officiel)

1. **Migration** `20260830_avis.sql` : table `avis` (`numero_id` unique → un avis par numéro,
   `note` 1-5, `texte`, `prenom`, `photo_url`, `consent_publication`, `statut`
   `recu|publie|refuse`, `motif_refus`, `reponse_atelier`, `cree_le`, `publie_le`,
   `experience_le`), RLS activée sans policy comme le reste.
2. **`src/lib/avis/regles.ts`**, PUR et testé dans `verif-atelier` : qui a le droit de
   déposer (état `livree` uniquement), la fenêtre de modification (14 j), le calcul de la
   moyenne, le seuil d'affichage, ce qui entre dans le balisage et ce qui n'y entre pas.
3. **`POST /api/atelier/avis`** : token en corps, idempotent, un avis par numéro,
   limitation de débit. La note seule suffit à créer la ligne (marche 1).
4. **Le bloc sur `/numero/[token]`**, visible dès l'état 8, avec `?note=` pré-rempli.
5. **M10 + M10b** dans `scripts/mails-atelier.mjs`, entrées dans `codesPour`, **M8 déplacé
   à J+15 et chaîné**. Templates poussés par `--pousser`, ID dans Vercel (Preview **et**
   Production).
6. **`/admin/atelier/avis`** : modération, réponse, refus motivé.
7. **`/avis`** + la charte de transparence + entrée sitemap + lien footer.
8. **Le bloc d'affichage sur `/`**, sans étoiles tant que le seuil n'est pas atteint,
   alimenté par un `getAvis()` unique que `/lancement` consommera aussi.
9. **Correction du `JSON_LD`** (`AggregateOffer`), sans note.

*Ordre de grandeur : deux à trois jours.*

### Lot B — au seuil (une demi-journée)

Moyenne et étoiles à l'écran, `aggregateRating` + `review` dans le `Product`, test dans
l'outil de résultats enrichis, surveillance Search Console.

### Lot C — quand le flux est établi (3 mois)

Trustpilot, galerie de photos clientes, segmentation des avis par occasion et premières
pages d'atterrissage par moment, arbitrage Google Seller Ratings si les Ads démarrent.

---

## 10. Les décisions à trancher (à reporter dans `DECISIONS.md`)

- **D3 — le seuil.** 10 avis (recommandé) ou 30 (règle actuelle, écrite dans `Avis.tsx`) ?
- **D4 — la contrepartie.** Recommandation ferme : **aucune**. À acter pour que la charte
  puisse l'écrire.
- **D5 — les trois témoignages bêta.** Étiquetés et hors moyenne, ou retirés au profit des
  premiers vrais avis ?
- **D6 — Trustpilot** au lancement, oui ou non ?
- **D7 — le déplacement de M8** à J+15 derrière M10 : validé ?
- **D8 — la durée de conservation** des avis publiés, à écrire dans la charte.
