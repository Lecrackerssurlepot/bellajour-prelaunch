# Accord de sous-traitance des données personnelles (annexe A) : projet

> **Statut : PROJET, À FAIRE RELIRE. Rien n'a été envoyé à un client.**
> Annexe A des Conditions de l'Édition collective, jointe à chaque devis (décision Q9). Repart du
> modèle court du §6 de `docs/produit/collectif/PROJET-CONFIDENTIALITE-B2B.md`, complété le
> 20/10/2026 avec les décisions de Mathias : Q8 (Bellajour sous-traitant pour les photos et les
> noms des participants, responsable autonome pour ses propres données), Q2 (adresse e-mail),
> Q3 (participants majeurs), Q4 (30 jours après « Marquer livrée »), Q5 (fichier du magazine
> terminé gardé, durée non fixée), Q6 (10 ans pour les pièces comptables, à confirmer), Q7 (preuve
> de l'accord gardée, durée à la relecture), et l'état du code au 20/10 (corbeille, album,
> personnes). Les crochets `[…]` se remplissent par édition ; `[À FIXER]` attend une décision.
> Le modèle de la Commission (clauses contractuelles types entre responsables et sous-traitants,
> décision d'exécution (UE) 2021/915) est une alternative : à faire relire.

---

**Accord de sous-traitance des données personnelles (RGPD, art. 28)**

Entre **[raison sociale du Client]**, [forme], [adresse], [numéro d'identification], représenté par
[nom, fonction] (« le Client », responsable du traitement),

et **MISTÉRIO HERMÉTICO, LDA** (marque Bellajour), NIPC 519443284, Beco de Santa Helena, 21A, 2.º,
1100-117 Lisbonne, Portugal (« Bellajour », sous-traitant).

Il est annexé au devis n° [référence] de l'édition « [événement] » et en fait partie.

## Article 1. Objet

Bellajour compose et fait imprimer le ou les magazines de l'édition décrite au devis. Pour cela,
Bellajour traite pour le compte du Client les données personnelles décrites à l'article 5, et
uniquement sur ses instructions documentées : le devis, le présent accord, les Conditions de
l'Édition collective, et les réglages que le Client fait dans son espace (dates d'ouverture et de
clôture, liens d'envoi, nombre de photos, présélection, « Ne pas publier », suppressions,
corrections de noms).

## Article 2. Durée

Le présent accord vaut le temps de l'édition et prend fin à la dernière suppression prévue à
l'article 10.

## Article 3. Nature et finalité du traitement

Collecte de photos par des liens d'envoi ; reconnaissance d'un participant par son adresse
e-mail d'un téléphone et d'un lien à l'autre ; stockage ; lecture des informations contenues dans
les photos (date, appareil, coordonnées GPS) et déduction de la ville et du pays ; repérage des
doublons ; affichage des photos au responsable, à son équipe et aux participants du même lien ;
tri, sélection, composition, bon à tirer, impression et livraison du magazine ; échanges avec le
responsable ; conservation du fichier du magazine terminé pour une réimpression.

## Article 4. Personnes concernées

Les participants invités par le Client ; les personnes visibles sur les photos ; les personnes
nommées dans les contenus que le Client envoie (liste des participants, programme…).

> Note : le responsable et l'équipe du Client figuraient dans le modèle du matin. Dans
> l'hypothèse A retenue (Q8), leurs données (contact, échanges, journal) sont celles dont
> Bellajour est **responsable autonome** (Conditions, art. 14.2) : elles sortent de cet accord.
> À faire relire.

## Article 5. Données traitées

- prénom, nom et adresse e-mail des participants (l'adresse n'est pas vérifiée) ;
- les photos et les informations qu'elles portent : nom du fichier, date et heure de prise de
  vue, appareil, coordonnées GPS ; la ville et le pays qui s'en déduisent ; une empreinte de
  l'image pour repérer les doublons ;
- la version du texte d'accord accepté et l'heure de l'acceptation ;
- un identifiant aléatoire du téléphone de chaque participant ;
- pour une photo supprimée : la date et l'auteur de la suppression (le participant, le
  responsable ou l'atelier) ;
- les messages, pièces jointes et contenus transmis, pour la part qui concerne des tiers.

Aucune donnée sensible n'est recherchée ni déduite. Aucune reconnaissance des visages n'est
réalisée. Aucun e-mail n'est envoyé aux participants.

> Note : relevé du code au 20/10 : `collectif_participants` (`20261023:87-112`),
> `collectif_participants_appareils` (`20261023:122-130`), `collectif_photos` (migrations 20261013,
> 20261020, 20261023 : `supprimee_le`, `supprimee_par`), `enrichissement.ts:63-73` (métadonnées),
> `geocodage.ts:74` (Geoapify ne reçoit que les coordonnées). Mails : tous à `responsable_email`.

## Article 6. Engagements du Client

6.1 Le Client détermine la base légale du traitement et informe les personnes qu'il invite, avant
la collecte, de l'usage de leurs photos. La section « L'Édition collective » de la Politique de
confidentialité de Bellajour et le texte d'accord de la page de dépôt peuvent l'y aider ; ils ne le
dispensent pas de son obligation.

6.2 Le Client s'assure des droits sur les photos et du droit à l'image des personnes
photographiées, y compris l'autorisation des représentants légaux des mineurs photographiés.

6.3 Participants majeurs. Le Client n'invite à envoyer des photos que des personnes âgées de 18 ans
ou plus. Il le confirme par écrit à Bellajour avant l'ouverture de la collecte. Si une personne
invitée a moins de 18 ans, le Client en informe Bellajour avant l'ouverture : aucune collecte n'est
ouverte à des participants mineurs [À FIXER après relecture juridique : le cadre convenu par écrit
pour une édition avec des participants mineurs].

6.4 Le Client garde confidentiels les liens d'accès qui lui sont remis (Conditions, article 3) et
ne remet le lien de son équipe qu'aux personnes qui doivent voir les photos.

6.5 Le Client transmet à Bellajour toute instruction utile sans délai, notamment toute demande
d'une personne concernée qui suppose une action de Bellajour.

> Note : 6.3 traduit la décision Q3 ; le message à Mathilde (`message-mathilde-majeurs.md`) en est
> l'application pour Audencia.

## Article 7. Engagements de Bellajour

7.1 Ne traiter les données que sur instruction documentée du Client, y compris pour un transfert
hors de l'Union, et l'avertir si une instruction lui paraît contraire au RGPD.

7.2 N'en faire aucun autre usage : ni prospection, ni portfolio, ni entraînement d'un modèle
d'intelligence artificielle ; ne réutiliser le fichier du magazine terminé qu'avec l'accord du
Client.

7.3 Réserver l'accès aux personnes de l'atelier qui en ont besoin, nommément désignées et tenues à
la confidentialité.

7.4 Appliquer les mesures de sécurité de l'article 32 du RGPD, dont au minimum :
- connexions chiffrées entre les navigateurs et le site ;
- base de données et coffre de fichiers dans l'Union européenne [À VÉRIFIER : la juridiction UE du
  coffre en production] ;
- liens d'accès secrets de 32 caractères aléatoires, comparés à durée constante, jamais écrits
  dans le journal ;
- comptes nominatifs pour l'atelier ;
- journal des écritures (qui a fait quoi, quand), sans adresse e-mail en clair ;
- identifiant d'appareil du responsable gardé seulement sous forme d'empreinte ;
- pages de dépôt et d'espace exclues des moteurs de recherche, identifiants secrets retirés de la
  mesure d'audience ;
- aux autres participants, une image réduite seulement, jamais le fichier d'origine et ses
  informations de lieu ;
- [À VÉRIFIER : chiffrement au repos chez les fournisseurs, sauvegardes et versions du coffre].
[Liste à compléter et à vérifier avant toute signature.]

7.5 Aider le Client, par des mesures adaptées, à répondre aux demandes des personnes concernées
(accès, rectification, effacement…) ; lui transmettre sans délai toute demande reçue directement ;
l'aider, s'il y a lieu, pour une analyse d'impact ou une consultation de l'autorité de contrôle.

7.6 Notifier au Client toute violation de données personnelles dans les meilleurs délais après en
avoir pris connaissance, et au plus tard [À FIXER avec la relecture : délai], avec les informations
de l'article 33.3 du RGPD dont elle dispose.

7.7 Mettre à la disposition du Client les informations nécessaires pour démontrer le respect du
présent accord, et permettre des audits, y compris des inspections, dans des conditions
raisonnables [À FIXER : préavis, fréquence, prise en charge des frais].

> Note, 7.3 : deux comptes nommés, Mathias et Louis (`src/lib/admin-auth.ts:55-56`), cookie signé
> de 7 jours (`admin-auth.ts:38`). 7.4 : vérifié dans le code : tokens `randomBytes(24)` en
> base64url, 32 caractères (`src/lib/atelier/token.ts:14`), `roleDuToken` à durée constante
> (`droits.ts`), jamais de token au journal (`journal.ts`), adresses masquées (`mails.ts:97-104`),
> empreinte sha256 de l'appareil (`appareil.ts:54`), `noindex` (`src/app/depot/layout.tsx:34-35`),
> masque d'audience (`src/lib/analytics/chemin.ts:65-66`), vignette seule dans l'album (audit
> S6). « Connexions chiffrées » : le site n'est servi qu'en https par Vercel ; aucun en-tête HSTS
> n'est posé par `next.config.ts` (à vérifier côté Vercel). Base en `eu-west-1`
> (`ETAT-PRODUCTION.md:201-202`).

## Article 8. Sous-traitants ultérieurs

8.1 Le Client autorise les sous-traitants ultérieurs de la liste ci-dessous. Bellajour l'informe de
tout ajout ou remplacement au moins [À FIXER] jours à l'avance ; le Client peut s'y opposer dans ce
délai [À FIXER : la conséquence d'une opposition]. Bellajour impose à chacun les mêmes obligations
de protection des données.

| Sous-traitant ultérieur | Ce qu'il fait pour l'édition | Localisation |
|---|---|---|
| Supabase | base de données | Union européenne (Irlande) |
| Cloudflare (R2) | stockage des photos, des pages du bon à tirer, du fichier du magazine et des documents | juridiction UE [À VÉRIFIER en production] ; Cloudflare, Inc. établie aux États-Unis |
| Vercel | hébergement du site et des fonctions (Dublin), mesure d'audience sans cookie | Vercel Inc., États-Unis |
| Brevo | e-mails au responsable (aucun aux participants) | Union européenne (France) |
| Geoapify | ville et pays à partir des coordonnées GPS des photos (les coordonnées seules) | [À VÉRIFIER] |
| Google (Agenda) **[CONDITION : rendez-vous en ligne branchés]** | rendez-vous avec le responsable : plages libres ou occupées de l'agenda de l'atelier, événement à son nom | [À VÉRIFIER] |
| Imprimeur | impression et expédition des magazines | [À FIXER : nom et localisation] |

8.2 Transferts hors de l'Union : encadrés par la décision d'adéquation EU-US Data Privacy Framework
lorsque le prestataire est certifié et, à défaut ou en complément, par les clauses contractuelles
types de la Commission européenne (voir la Politique de confidentialité, §9).

> Note : Google ne traite des données qu'une fois `GOOGLE_AGENDA_COMPTE` posée (absente le 20/10,
> `ETAT-PRODUCTION.md:343`). La composition se fait sur Affinity, sur les postes de l'atelier (PRD
> §3, point 4) : aucun service en ligne de plus, à confirmer par Mathias. Aucun outil de
> reconnaissance des visages ni d'IA générative ne reçoit les photos des éditions (vérifié le
> 20/10 dans `src/`).

## Article 9. Les personnes qui voient les données

Pour que le Client puisse en informer les personnes qu'il invite :
- l'atelier Bellajour voit toutes les photos, avec le nom et l'adresse e-mail de chacun ;
- le responsable voit toutes les photos avec le nom de chacun, l'adresse lui apparaissant masquée ;
- l'équipe du Client voit, en lecture, les mêmes photos et les mêmes noms, sans adresse ;
- chaque participant voit les photos envoyées par le même lien, en image réduite, avec le seul
  prénom de leur auteur, si celui-ci a accepté le texte qui l'annonce ;
- une adresse e-mail tapée par un tiers ne donne accès à aucune photo et ne permet de supprimer que
  les photos envoyées depuis son propre téléphone.

## Article 10. Durées et fin du traitement

| Donnée | Ce qu'elle devient |
|---|---|
| Photos (originaux et images réduites), informations qu'elles portent, pages du bon à tirer, versions intermédiaires du magazine, contenus envoyés, pièces jointes | effacés 30 jours après la livraison constatée par l'atelier |
| Adresse e-mail des participants, et le rattachement de leurs téléphones | effacés dans le même passage |
| Photo supprimée par le Client, par l'atelier ou par la personne qui l'a envoyée | 30 jours au plus dans une corbeille, où le Client peut la restaurer, puis effacée définitivement |
| Fichier du magazine terminé | conservé [À FIXER : nombre d'années] pour une réimpression, sauf demande contraire du Client ; jamais réutilisé sans son accord ; puis effacé |
| Nom du participant, version et heure de son accord | conservés après l'effacement des photos, [À FIXER avec la relecture : durée], le temps qu'une réclamation sur le magazine reste possible |
| Devis signé, factures, propositions | 10 ans, obligation comptable et fiscale portugaise [à confirmer à la relecture pour un client entreprise] |

L'archivage d'une édition dans l'outil de l'atelier ne prolonge aucune de ces durées. Avant ces
dates, et à la demande du Client, Bellajour efface les données plus tôt ou lui remet les photos
reçues [À FIXER : format et moyen de remise]. Les copies de travail tenues par l'atelier hors de
son coffre suivent les mêmes durées [CONDITION : procédure écrite et appliquée].

> Note : décisions Q2, Q4, Q5, Q6, Q7 ; corbeille : `corbeille.ts:52`. Les lignes « effacés » ne
> sont vraies qu'une fois le code fait (`A-RELIRE.md`, partie C) : aujourd'hui le script
> d'effacement n'a jamais tourné, garde le PDF de chaque tour et ne touche pas aux adresses.
> La remise des photos : l'atelier sait déjà télécharger un lot complet d'une édition (route
> `api/admin/collectif/editions/[id]/lot`).

## Article 11. Responsabilité

Chaque partie répond de ses manquements au présent accord et au RGPD, dans les conditions de
l'article 82 du RGPD et de l'article 13 des Conditions de l'Édition collective [À faire relire :
l'articulation avec le plafond de l'article 13.1 des Conditions].

## Article 12. Droit applicable

[À FIXER avec la relecture : droit applicable et juridiction, en cohérence avec l'article 17 des
Conditions.]

---

Fait le [date], en [nombre] exemplaires.

Pour le Client : [nom, fonction, signature] · Pour Bellajour : [nom, fonction, signature]
