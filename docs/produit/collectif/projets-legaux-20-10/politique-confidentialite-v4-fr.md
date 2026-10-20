# Politique de confidentialité, version 4 : projet en français

> **Statut : PROJET, À FAIRE RELIRE. Rien de ce fichier n'est en ligne.**
> `src/app/legal/content/confidentialite.ts` n'a pas été touché : la mise en ligne attend l'accord
> explicite de Mathias, donné texte par texte, et la relecture juridique.
>
> **Le portugais fait foi.** La version PT n'est PAS écrite ici : elle sera rédigée avec la
> relecture, puis l'anglaise. Ce fichier ne porte que le français.
>
> Base : la version FR **3.1** telle qu'elle est en ligne le 20/10/2026
> (`confidentialite.ts:21-162`), recopiée mot pour mot. Décisions intégrées : celles de Mathias du
> 20/10/2026, réponses aux onze questions de sa page (numérotation de la page : Q1 à Q11).
> Rédigé le 20/10/2026. Tickets : T-158, T-159, T-203.

## Comment lire ce projet

- Un texte sans marque est **identique** à la version en ligne, au mot près (les tirets
  cadratins d'origine sont gardés tels quels : voir `A-RELIRE.md`, point « ponctuation »).
- **[AJOUT]** : texte nouveau.
- **[RETRAIT]** ~~texte barré~~ : texte en ligne qui disparaît.
- **[MODIFIÉ]** : la version en ligne barrée, puis la nouvelle.
- **[CONDITION : …]** : phrase à ne publier que le jour où le code la rend vraie (la liste est
  dans `A-RELIRE.md`, partie C).
- **[À FIXER : …]** : une donnée qui manque et que personne n'a encore donnée.
  **[À VÉRIFIER : …]** : un fait à confirmer avant publication.
- `> Note :` une remarque pour Mathias et la relecture, **jamais publiée**. Les chemins de code
  ne vivent que dans ces notes.

---

**Politique de confidentialité**

**[MODIFIÉ]** ~~Version 3.1 — En vigueur le 13/06/2026~~
Version 4.0, en vigueur le [À FIXER : date de mise en ligne]

> Note : le numéro de version sert de preuve d'acceptation ; sa bascule se décide avec le lot
> juridique (`docs/produit/LOT-JURIDIQUE.md`, point 10).

MISTÉRIO HERMÉTICO, LDA · NIPC 519443284

**[MODIFIÉ]** ~~Traduction française à titre informatif. La version juridiquement prévalente est le
texte portugais ; en cas de divergence, ce dernier prime. Cette politique complète les Conditions
Générales de Vente, auxquelles elle est liée (RGPD, art. 13 et 14).~~
Traduction française à titre informatif. La version juridiquement prévalente est le texte
portugais ; en cas de divergence, ce dernier prime. Cette politique complète les Conditions
Générales de Vente et, pour l'Édition collective, les Conditions de l'Édition collective,
auxquelles elle est liée (RGPD, art. 13 et 14).

---

## 1. Qui est responsable de vos données

Le responsable du traitement est MISTÉRIO HERMÉTICO, LDA (marque Bellajour), NIPC 519443284, dont
le siège est situé Beco de Santa Helena, 21A, 2.º, 1100-117 Lisbonne, Portugal.

**[MODIFIÉ]** ~~Bellajour est responsable de traitement pour l'ensemble de ses opérations, y compris
le traitement des photos que vous nous transmettez pour produire votre album : c'est Bellajour qui
décide des finalités et des moyens. Bellajour n'est pas le sous-traitant du client.~~
Bellajour est responsable de traitement pour l'ensemble de ses opérations auprès des particuliers,
y compris le traitement des photos que vous nous transmettez pour produire votre album : c'est
Bellajour qui décide des finalités et des moyens. Bellajour n'est pas le sous-traitant du client.
Pour l'Édition collective, proposée aux entreprises, écoles et associations, les rôles sont
différents : voir §13.2.

> Note : décision Q8 (Bellajour sous-traitant de l'entreprise cliente pour les photos et les noms
> des participants). Qualification à faire relire.

Contact en matière de protection des données : contact@bellajour.com.

Délégué à la protection des données (DPO) : la désignation d'un DPO n'est pas obligatoire au
lancement (pas de traitement à grande échelle au sens de l'article 37 du RGPD). Toute demande
relative à vos données est traitée via contact@bellajour.com.

> Note : avec des éditions de plusieurs milliers de photos (Audencia), la relecture dira si
> « pas de traitement à grande échelle » reste vrai (`A-RELIRE.md`, partie A).

## 2. Vos responsabilités sur le contenu que vous nous confiez

Lorsque vous téléversez des photos, vous garantissez disposer de tous les droits nécessaires :
droit à l'image des personnes figurant sur les clichés, autorité parentale ou autorisations pour
les mineurs photographiés, et droits de propriété intellectuelle. Pour un usage purement personnel,
vos photos relèvent en principe de l'exemption domestique (art. 2.2.c RGPD) ; mais dès leur
transmission à Bellajour pour production, c'est Bellajour qui traite la donnée et en répond.

## 3. Quelles données, pour quelles finalités, sur quelle base légale

| Catégorie de données | Finalité | Base légale (RGPD) |
|---|---|---|
| Nom, e-mail, adresse postale | Commande, livraison, facturation, SAV | Exécution du contrat (art. 6.1.b) |
| Données de paiement (via Stripe) | Traitement du paiement, prévention de la fraude | Exécution du contrat / obligation légale (6.1.b / 6.1.c) |
| Photos et contenus téléversés | Production de l'album selon vos spécifications (tri, sélection, composition, génération de la couverture, fichier HD) | Exécution du contrat (6.1.b) |
| **[AJOUT]** Informations contenues dans vos photos (date et heure de prise de vue, appareil, coordonnées GPS), lieu qui s'en déduit (ville, pays) et empreinte calculée sur l'image | Classer vos photos par jour et par lieu pour composer l'album ; repérer les doublons | Exécution du contrat (6.1.b) |
| **[RETRAIT]** ~~Données biométriques (gabarit facial calculé à partir de vos photos)~~ | ~~Regroupement des photos par personne et étape de « Casting » (hiérarchisation des personnes)~~ | ~~Consentement explicite (art. 9.2.a) — voir §5~~ |
| Historique de commandes | Compte client, SAV, garanties légales | Exécution du contrat / obligation légale |
| **[AJOUT]** Connexion au compte client avec Google, si vous la choisissez : nom, adresse e-mail et photo de profil transmis par Google | Ouvrir votre compte sans mot de passe ; afficher votre photo dans la barre du site | Exécution du contrat (6.1.b) |
| Données de facturation (nom, adresse, NIF si fourni, montant) | Émission des factures certifiées | Obligation légale (6.1.c) |
| Preuves de commande et de validation (version des CGV acceptée et horodatage de l'acceptation, horodatage du téléversement, horodatage et version de la validation de la maquette, identifiant de transaction Stripe) | Preuve du consentement, gestion des litiges et obligations comptables | Obligation légale (6.1.c) et intérêt légitime (6.1.f) |
| Logs de connexion, adresse IP | Sécurité technique, prévention des fraudes | Intérêt légitime (6.1.f) |
| E-mail (newsletter) | Prospection commerciale | Consentement (case dédiée) — ou soft opt-in pour un client existant (voir §8) |
| Données de session (panier) | Fonctionnement du site | Nécessité technique |
| Cookies / pixel marketing (Meta) | Publicité ciblée et mesure publicitaire | Consentement (art. 6.1.a) — voir §8 |
| **[AJOUT]** Édition collective (participants, responsable) | Voir §13.3 | Voir §13.3 |

> Note, ligne « informations contenues dans vos photos » : le code des particuliers lit la date,
> l'appareil et le GPS de chaque photo, calcule une empreinte pour les doublons et envoie les
> coordonnées à Geoapify, une requête par lieu, sans la photo (`src/lib/atelier/metadonnees.ts`,
> `empreinte.ts`, `lieux.ts`, `geocodage.ts:26,74` ; appelé par
> `src/app/api/atelier/numero/route.ts:793`). La politique en ligne ne le dit nulle part. Base
> légale proposée, à faire relire.
>
> Note, ligne « connexion avec Google » : le compte client est ouvert au public depuis le 06/09
> (`docs/reference/ETAT-PRODUCTION.md:1132`), connexion Google par Supabase Auth
> (`src/app/api/compte/google/route.ts:39-40`) ; la page lit le nom et la photo transmis par
> Google (`src/lib/compte/session.ts:176-177`). Rien n'en est dit aujourd'hui. Base et rôle de
> Google à faire relire.
>
> Note, ligne « Preuves » : la VERSION des CGV acceptée n'est stockée nulle part
> (`LOT-JURIDIQUE.md`, point 11). Non tranché, texte inchangé.

## 4. Le traitement automatisé de vos photos (transparence)

Pour composer votre album, vos photos font l'objet d'une analyse automatisée : tri, scoring de
qualité, sélection et mise en page. Une couverture illustrée est générée par IA dans un style
propre à la marque.

> Note : deux faits à confirmer par Mathias avant publication, hors des onze décisions. (1) Le
> code range et signale (doublons, photos sombres ou claires, captures d'écran : « des REMARQUES,
> jamais des exclusions », `src/lib/atelier/CLAUDE.md`) ; la sélection et la mise en page sont
> faites par l'atelier. « Scoring de qualité, sélection et mise en page » automatisés ne sont pas
> dans le code. (2) Avec OpenAI et Fal.ai retirés (Q11), quel outil fait la couverture « générée
> par IA » ? S'il reçoit une photo ou une description du client, il doit entrer au §9.

**[MODIFIÉ]** ~~La base légale est l'exécution du contrat (art. 6.1.b) pour ces opérations, à
l'exception du regroupement par visage, qui relève du consentement explicite (art. 9 — voir §5).~~
La base légale est l'exécution du contrat (art. 6.1.b) pour ces opérations. Aucune reconnaissance
des visages n'est réalisée (§5).

Cette composition ne produit pas d'effet juridique ni d'effet significatif sur vous au sens de
l'art. 22 RGPD : un contrôle humain intervient et vous validez la maquette finale.

**[MODIFIÉ]** ~~Conformité AI Act (Règl. (UE) 2024/1689) : le moteur n'est pas, à ce jour, un
système à haut risque ; il met en œuvre une catégorisation biométrique soumise à une obligation de
transparence, satisfaite par la présente information.~~
Conformité AI Act (Règl. (UE) 2024/1689) : le moteur n'est pas, à ce jour, un système à haut
risque, et il ne met en œuvre aucune catégorisation biométrique.

> Note : à faire relire. Faut-il garder ce paragraphe, et la génération d'une couverture par IA
> appelle-t-elle une autre information de transparence ?

Pas de réutilisation de vos photos à d'autres fins (marketing, entraînement d'IA, portfolio) sans
votre consentement séparé, explicite et spécifique.

## 5. **[MODIFIÉ]** ~~Données biométriques — reconnaissance des visages~~ Reconnaissance des visages : aucune

**[RETRAIT]** ~~5.1 Ce que nous faisons. Si vous y consentez, Bellajour calcule à partir de vos photos
une empreinte faciale (gabarit) permettant de regrouper les photos par personne. Ce regroupement
alimente l'étape de « Casting » (hiérarchisation et mise en avant des personnes clés dans
l'album). Il s'agit d'un traitement de données biométriques au sens de l'article 9 du RGPD.~~

**[RETRAIT]** ~~5.2 Base légale : votre consentement explicite (art. 9.2.a), recueilli avant
l'analyse via une case à cocher dédiée, distincte des CGV et de la validation de la maquette.~~

**[RETRAIT]** ~~5.3 Caractère facultatif. Ce consentement est libre. Si vous le refusez, votre album
est composé normalement, sans l'étape de Casting ; aucune autre fonctionnalité n'est dégradée.
Vous pouvez retirer votre consentement à tout moment, sans effet sur la licéité du traitement déjà
effectué.~~

**[RETRAIT]** ~~5.4 Traitement réalisé exclusivement dans l'Union européenne. La reconnaissance des
visages est effectuée via le service Amazon Web Services (AWS) Rekognition, dans la région UE
d'Irlande (eu-west-1). Le calcul de l'empreinte faciale et son traitement ont intégralement lieu
au sein de l'Union européenne : aucun transfert de vos données biométriques n'a lieu en dehors de
l'UE.~~

**[RETRAIT]** ~~5.5 Durée — suppression dès la composition. L'empreinte faciale est conservée dans
un espace de traitement temporaire, supprimé dès que la composition de votre album est terminée.
Le gabarit n'est pas conservé au-delà et aucune base d'empreintes ou d'identités n'est constituée
ni réutilisée d'une commande à l'autre.~~

**[RETRAIT]** ~~5.6 Pas d'identification nominative. Bellajour ne rattache aucune identité civile aux
visages ; le regroupement est purement technique et interne à votre commande.~~

**[AJOUT]** Bellajour ne réalise aucune reconnaissance des visages et ne calcule aucune empreinte
faciale, ni pour les particuliers ni pour l'Édition collective : aucune donnée biométrique n'est
traitée. Si un tel service est un jour proposé, il ne le sera qu'après une mise à jour de la
présente politique, et seulement avec votre consentement séparé, explicite et facultatif, recueilli
avant toute analyse.

> Note : décision Q11. Vérifié le 20/10 : ni `rekognition`, ni `openai`, ni `fal.ai` dans `src/`
> (hors des textes légaux eux-mêmes) ni dans `package.json`. La section garde son numéro pour que
> les renvois (§7, §8, §9…) ne bougent pas. ⚠️ Les CGV (art. 3.2 et 11.3) et les mentions
> légales (§3 et §9) parlent aussi de reconnaissance des visages et de prestataires américains de
> la couverture : ce sont d'autres textes légaux, à corriger dans le même lot (`A-RELIRE.md`).

## 6. Photos potentiellement « révélatrices » et photos d'enfants

**[MODIFIÉ]** ~~6.1 Une photo peut révéler indirectement une origine, des convictions, un état de
santé ou une orientation. Hors reconnaissance des visages (§5), Bellajour traite ces contenus sur
la base de l'exécution du contrat (art. 6.1.b), sans en exploiter ni en déduire aucun attribut
sensible, et applique des mesures de minimisation et d'accès restreint renforcées.~~
6.1 Une photo peut révéler indirectement une origine, des convictions, un état de santé ou une
orientation. Bellajour traite ces contenus sur la base de l'exécution du contrat (art. 6.1.b),
sans en exploiter ni en déduire aucun attribut sensible, et applique des mesures de minimisation
et d'accès restreint renforcées. Pour l'Édition collective, voir §13.

6.2 Pour les photos d'enfants fournies par un adulte : le client garantit disposer de l'autorité
parentale ou des autorisations nécessaires ; Bellajour applique des mesures de sécurité et des
durées de conservation renforcées (§7).

> Note : « des durées de conservation renforcées » pour les photos d'enfants : aucune durée
> propre n'existe dans le code ni dans le §7. Non tranché, texte inchangé (`A-RELIRE.md`).

6.3 Mineurs. Le service n'est pas destiné aux personnes de moins de 18 ans ; aucun compte ni
commande n'est ouvert à un mineur (CGV, art. 2). **[AJOUT]** Pour l'Édition collective, les
participants doivent avoir 18 ans ou plus : voir §13.9.

## 7. Combien de temps nous conservons vos données

Les durées ci-dessous distinguent les obligations légales portugaises des choix de conservation
documentés par Bellajour (RGPD, art. 5.1.e).

| Donnée | Conservation |
|---|---|
| Photos téléversées + fichier HD | **[MODIFIÉ] [CONDITION : effacement des particuliers construit et en service, Q10]** ~~Supprimées 90 jours après la livraison (sauf option de sauvegarde long terme future, qui ferait l'objet d'un consentement séparé)~~ Supprimées 90 jours après la livraison, date constatée par le transporteur ou, à défaut, par l'atelier (sauf option de sauvegarde long terme future, qui ferait l'objet d'un consentement séparé) |
| **[AJOUT] [CONDITION : passage régulier de l'anonymisation, voir note]** Dossier laissé sans suite (photos jamais envoyées à l'atelier, ou aperçu jamais commandé) | Photos supprimées et données personnelles effacées 90 jours après la dernière activité du dossier ou, si les photos ont été envoyées à l'atelier sans commande, 90 jours après cet envoi ; un e-mail vous prévient 7 jours avant (CGV, art. 4 bis.2) |
| **[RETRAIT]** ~~Gabarit biométrique~~ | ~~Supprimé dès la composition de l'album (voir §5.5)~~ |
| Compte client | Suppression 3 ans après le dernier achat ou contact |
| Commandes, factures et preuves de validation | 10 ans — obligation comptable et fiscale portugaise (Código Comercial, art. 40 ; CIVA / SAF-T) |
| Données marketing (prospects) | 3 ans après le dernier contact, ou jusqu'au retrait du consentement |
| Logs techniques | 12 mois |
| **[AJOUT]** Édition collective | Voir §13.5 |

> Note, ligne « Photos » : décision Q10, tenir la promesse. Aujourd'hui aucun code ne la tient :
> le seul effacement des particuliers (`scripts/anonymiser-dossiers.ts`,
> `src/lib/atelier/retention.ts:117-124`) épargne tout dossier payé ou livré (`ETATS_ENGAGES`).
> La phrase actuelle reste en ligne en attendant ; la phrase « [MODIFIÉ] » ci-dessus est la
> formulation exacte une fois l'effacement construit (elle ne fait que dire d'où vient la date :
> le signal de livraison du transporteur ou le geste « Marquer livrée » de l'atelier,
> `src/lib/atelier/transitions.ts:299-309`). ⚠️ Deux conflits à trancher avant de construire
> (`A-RELIRE.md`) : la garantie de conformité de 3 ans des CGV (art. 9.1 et 9.4, remède par
> réimpression) ne peut plus être tenue par une réimpression si le fichier est effacé à 90 jours ;
> et les copies hors du coffre (maquette Canva de l'atelier) doivent partir aussi.
>
> Note, ligne « Dossier laissé sans suite » : durée décidée par Mathias le 01/09 et déjà écrite aux
> CGV (art. 4 bis.2) ; la politique n'en dit rien (`LOT-JURIDIQUE.md`, point 7). Le script
> `scripts/anonymiser-dossiers.ts` n'a ni cron ni route : la promesse n'est tenue que si quelqu'un
> le lance.

## 8. Cookies et communications marketing

8.1 Cookies (directive ePrivacy ; Lei 41/2004). Le site utilise :
- des cookies strictement nécessaires (session, panier) — pas de consentement requis, mais
  déclarés ;
- le pixel publicitaire Meta (Meta Ads / Meta Pixel), cookie marketing soumis à consentement
  préalable.

Le bandeau de consentement permet d'accepter, refuser ou personnaliser avec la même facilité (pas
de dark patterns). Le pixel Meta n'est activé qu'après votre consentement. La preuve du choix
(date, version) est conservée et le consentement est re-sollicité périodiquement. Une politique
cookies détaillée est accessible via le bandeau.

> Note : le bandeau n'existe pas dans le code et le pixel Meta n'est pas posé (`LOT-JURIDIQUE.md`,
> points 8 et 9). Non tranché, texte inchangé.

**[MODIFIÉ]** ~~Mesure d'audience sans cookie (Vercel Web Analytics). Le site mesure sa fréquentation
via Vercel Web Analytics, qui ne dépose aucun cookie et n'utilise aucun identifiant persistant.
Les données collectées sont : la page consultée — les identifiants secrets figurant dans certains
de nos liens (accès à votre commande, reprise d'un dépôt) sont retirés de l'adresse avant tout
envoi —, le site ou le lien d'où vous venez (référent), le pays et la ville, le type d'appareil, le
navigateur et le système d'exploitation. Ces données ne sont pas revendues et ne sont pas
recoupées avec celles d'autres sites : aucun identifiant ne permet de vous suivre d'un site à
l'autre. Vercel intervient ici comme sous-traitant (§9).~~
Mesure d'audience sans cookie (Vercel Web Analytics). Le site mesure sa fréquentation via Vercel
Web Analytics, qui ne dépose aucun cookie et n'utilise aucun identifiant persistant. Les données
collectées sont : la page consultée — les identifiants secrets figurant dans certains de nos liens
(accès à votre commande, reprise d'un dépôt, espace et lien de dépôt de l'Édition collective) sont
retirés de l'adresse avant tout envoi —, le site ou le lien d'où vous venez (référent), le pays et
la ville, le type d'appareil, le navigateur et le système d'exploitation. Ces données ne sont pas
revendues et ne sont pas recoupées avec celles d'autres sites : aucun identifiant ne permet de vous
suivre d'un site à l'autre. Vercel intervient ici comme sous-traitant (§9).

> Note : l'ajout ne fait que nommer ce que le code fait déjà : `/edition/<token>` et
> `/depot/<token>` sont masqués avant tout envoi (`src/lib/analytics/chemin.ts:65-66`). Speed
> Insights (même masque) n'est toujours pas mentionné (`LOT-JURIDIQUE.md`, réserve finale) : non
> tranché.

8.2 Partage avec Meta. Lorsque vous y consentez, certaines données de navigation sont transmises à
Meta Platforms Ireland à des fins de mesure et de ciblage publicitaires ; Meta peut les transférer
aux États-Unis, transfert couvert par le Data Privacy Framework (DPF). Pour ces opérations,
Bellajour et Meta peuvent agir en responsables conjoints dans les limites définies par Meta.

8.3 Newsletter. L'inscription à la newsletter (gérée via Brevo) repose sur une case de
consentement dédiée, non pré-cochée ; pour un client existant, un soft opt-in est possible (Lei
41/2004, art. 13.º, n.º 2). Chaque message comporte un lien de désinscription simple.

**[AJOUT]** 8.4 Édition collective : ce qui est gardé sur votre appareil. Le dépôt des photos et
l'espace de l'Édition collective (§13) n'utilisent aucun cookie publicitaire ni de mesure
d'audience. Ils gardent sur votre appareil :

| Nom | Où | Contenu | Durée | Pourquoi |
|---|---|---|---|---|
| `bj_depot_appareil` | cookie, illisible par les scripts de la page | un identifiant aléatoire de votre téléphone | 1 an | tenir le nombre de photos par personne ; reconnaître le téléphone qui a envoyé, pour que vous seul puissiez supprimer les photos envoyées depuis ce téléphone ; retrouver sous quel nom vous envoyez |
| `bj_ec_appareil` | cookie, illisible par les scripts de la page | un identifiant aléatoire de l'appareil du responsable ; nous n'en gardons que l'empreinte | 1 an | reconnaître l'appareil depuis lequel le responsable peut modifier l'espace |
| `bj_ec_mode` | cookie | votre choix d'affichage, jour ou nuit ; rien de personnel | 1 an | afficher l'espace dans le mode choisi |
| `bj-depot-sel` | mémoire du navigateur | un code aléatoire propre à l'appareil | jusqu'à ce que vous effaciez les données du site | éviter qu'une même photo parte deux fois |
| `bj-depot-vu-…` | mémoire du navigateur | la date de la dernière photo vue dans l'album du lien | idem | vous montrer les photos arrivées depuis votre dernière visite |
| `bj-depot-prenom-…` | mémoire du navigateur | le nom sous lequel vous envoyez | idem | ne pas vous le redemander, sur un dépôt qui ne demande pas d'adresse e-mail |

Aucun de ces éléments ne sert à vous suivre d'un site à l'autre.

> Note : relevé du code le 20/10 : `src/lib/collectif/collecte.ts:16` et
> `src/app/api/collectif/depot/participant/route.ts:165-171` (httpOnly, un an) ;
> `src/lib/collectif/appareil.ts:25-27,54` (empreinte sha256) ; `src/lib/collectif/affichage.ts:15,24`
> (`path=/edition`, un an) ; `src/app/edition/_composants/depot/moteur.ts:245-256` ;
> `src/app/depot/[token]/Album.tsx:74-86,137-141` et `src/lib/collectif/depotParticipant.ts:49-56`
> (le nom de la clé est une empreinte, jamais le token) ; `src/app/depot/[token]/Depot.tsx:81-95,274`
> (écrit seulement sans la migration 20261023, lu toujours). À faire relire : le régime de
> `bj_ec_mode` et du repère de visite au regard de l'article 5.3 de la directive ePrivacy
> (préférence et confort, pas strictement nécessaires).

## 9. À qui vos données sont transmises (sous-traitants et transferts)

Chaque sous-traitant est lié par un contrat conforme à l'art. 28 RGPD (DPA).

> Note : à vérifier pour chaque ligne ajoutée (Geoapify, Google, Canva) : un DPA accepté existe-t-il ?

| Sous-traitant | Rôle | Localisation | Transfert hors UE |
|---|---|---|---|
| **[RETRAIT]** ~~AWS (Amazon Web Services)~~ | ~~Reconnaissance des visages (biométrie)~~ | ~~UE — Irlande (eu-west-1)~~ | ~~Non~~ |
| Stripe | Paiement (certifié PCI-DSS) | UE / États-Unis | Oui — DPF / CCT |
| InvoiceXpress | Facturation certifiée | UE (Portugal) | Non |
| Supabase | **[MODIFIÉ]** ~~Base de données / registres de preuve~~ Base de données, registres de preuve et connexion au compte client | Union européenne | Non |
| Cloudflare R2 | Stockage des photos et du fichier HD | UE (restriction de juridiction UE) ; Cloudflare, Inc. établie aux États-Unis | Encadré DPF / CCT par précaution |
| Vercel | Hébergement du site et mesure d'audience (Vercel Web Analytics) | États-Unis | Oui — DPF / CCT |
| Brevo | E-mails transactionnels et newsletter | UE (France) | Non |
| Imprimeur / sous-traitant de production | Production physique des albums | Union européenne | Non |
| **[RETRAIT]** ~~OpenAI~~ | ~~Analyse et préparation de la couverture illustrée~~ | ~~États-Unis~~ | ~~Oui — CCT~~ |
| **[RETRAIT]** ~~Fal.ai~~ | ~~Génération de la couverture illustrée~~ | ~~États-Unis~~ | ~~Oui — CCT~~ |
| Meta (Pixel / Ads) | Publicité et mesure | Meta Ireland / États-Unis | Oui — DPF (sous consentement, §8) |
| **[AJOUT]** Geoapify | Déduire la ville et le pays à partir des coordonnées GPS des photos : seules les coordonnées sont envoyées, jamais la photo | [À VÉRIFIER : entité et localisation] | [À VÉRIFIER] |
| **[AJOUT]** Google (connexion) | Connexion au compte client avec Google, si vous la choisissez | [À VÉRIFIER] | [À VÉRIFIER] |
| **[AJOUT] [CONDITION : rendez-vous en ligne branchés]** Google (Agenda) | Rendez-vous de l'Édition collective : lecture des seules plages libres ou occupées de l'agenda de l'atelier, et inscription du rendez-vous (nom et adresse e-mail du responsable, sujet) | [À VÉRIFIER] | [À VÉRIFIER] |
| **[AJOUT] [À CONFIRMER PAR MATHIAS]** Canva | Mise en page de l'album des particuliers et partage de la maquette | [À VÉRIFIER] | [À VÉRIFIER] |

> Note, Geoapify : `src/lib/atelier/geocodage.ts:26,74` (lat, lon, langue, clé ; rien
> d'autre), clé posée en Production (`ETAT-PRODUCTION.md:556`), particuliers ET éditions.
>
> Note, Google Agenda : `src/lib/collectif/agenda.ts` (libre / occupé seulement),
> `src/lib/collectif/rendezvous.ts:107-112` (nom, adresse et sujet dans l'événement).
> `GOOGLE_AGENDA_COMPTE` est absente en production (`ETAT-PRODUCTION.md:343`) : la ligne ne se
> publie que le jour où elle est posée.
>
> Note, Canva : hors des onze décisions, à confirmer. Le code des particuliers garde le lien du
> design Canva de chaque dossier (`src/app/admin/atelier/types.ts:370-372`, `src/lib/atelier/canva.ts`)
> et le client y commente sa maquette (`src/lib/atelier/CLAUDE.md`, M5) : les photos y sont donc
> déposées. Canva n'est déclaré nulle part. Si c'est confirmé, la ligne entre au tableau ; sinon
> elle part de ce projet.
>
> Note, imprimeur : pour les particuliers c'est Cloudprinter (`src/lib/atelier/impression.ts`,
> `cloudprinter.ts`) ; pour les éditions, aucun outil du code ne le nomme. La ligne générique
> reste ; la nommer est une question de la relecture.

**[MODIFIÉ]** ~~Transferts hors UE. Les transferts vers les États-Unis (Stripe, Vercel, OpenAI, Fal.ai,
Meta, et le cas échéant Cloudflare) sont couverts par la décision d'adéquation EU-US Data Privacy
Framework (DPF) lorsque le prestataire est certifié et, à défaut ou en complément, par les Clauses
Contractuelles Types (CCT) de la Commission européenne. Vos données biométriques font exception :
elles sont traitées intégralement au sein de l'UE (AWS, Irlande) et ne font l'objet d'aucun
transfert hors UE (§5).~~
Transferts hors UE. Les transferts vers les États-Unis (Stripe, Vercel, Meta, et le cas échéant
Cloudflare [À VÉRIFIER : Google, Geoapify et Canva selon leur localisation]) sont couverts par la
décision d'adéquation EU-US Data Privacy Framework (DPF) lorsque le prestataire est certifié et, à
défaut ou en complément, par les Clauses Contractuelles Types (CCT) de la Commission européenne.

Bellajour ne vend pas vos données.

## 10. Sécurité (art. 32 RGPD)

Chiffrement en transit et au repos, accès restreint aux photos et aux contenus, authentification
forte interne, politique d'habilitation des accès, journalisation des accès et procédure de
notification des violations de données (CNPD sous 72 heures ; personnes concernées en cas de
risque élevé).

> Note : non tranché, texte inchangé, mais trois mots à vérifier avant de republier
> (`A-RELIRE.md`) : « authentification forte interne » (l'atelier se connecte par mot de passe et
> cookie signé de 7 jours, `src/lib/admin-auth.ts:38,55-56` ; aucun second facteur dans le code),
> « journalisation des accès » (le journal des éditions trace les écritures, pas les lectures),
> « chiffrement au repos » (à confirmer chez Supabase et Cloudflare).

## 11. Vos droits

**[MODIFIÉ]** ~~Vous disposez des droits d'accès, rectification, effacement, limitation, opposition
(immédiate pour le marketing direct), portabilité et retrait du consentement à tout moment
(notamment pour la reconnaissance des visages et la newsletter).~~
Vous disposez des droits d'accès, rectification, effacement, limitation, opposition (immédiate pour
le marketing direct), portabilité et retrait du consentement à tout moment (notamment pour la
newsletter).

Exercice : contact@bellajour.com (une vérification d'identité peut être demandée) ; réponse dans un
délai d'un mois (prorogeable jusqu'à trois). Pour les mineurs photographiés, les droits sont
exercés par les représentants légaux.

Vous avez le droit d'introduire une réclamation auprès de la CNPD (Comissão Nacional de Proteção
de Dados, www.cnpd.pt).

**[AJOUT]** Pour les photos et les noms des participants d'une Édition collective, voir §13.6.

## 12. Documentation interne et évolution

**[MODIFIÉ]** ~~Bellajour tient un registre des activités de traitement (art. 30) et réalise une
analyse d'impact (AIPD/DPIA, art. 35) sur le traitement biométrique des photos.~~
Bellajour tient un registre des activités de traitement (art. 30).

> Note : à faire relire. (1) Le registre existe-t-il (à vérifier par Mathias) ? (2) Une analyse
> d'impact est-elle requise pour l'Édition collective (volume de photos, coordonnées GPS,
> salariés ou élèves invités par leur organisation) ? Si oui, la phrase la nomme.

**[MODIFIÉ]** ~~Toute évolution future — notamment une « mémoire des visages » (conservation des
gabarits d'une commande à l'autre pour le confort du compte) ou une application mobile — fera
l'objet d'une information actualisée et, le cas échéant, d'un nouveau consentement spécifique
avant sa mise en œuvre.~~
Toute évolution future, notamment une reconnaissance des visages ou une application mobile, fera
l'objet d'une information actualisée et, le cas échéant, d'un nouveau consentement spécifique avant
sa mise en œuvre.

Le service est proposé au sein de l'Union européenne ; toute extension hors UE donnera lieu à une
mise à jour de la présente politique.

> Note : la zone de livraison des particuliers comprend les États-Unis et le Brésil depuis la v4.0
> des CGV (art. 4 bis.6). Non tranché ici, à relire avec le lot.

---

## 13. **[AJOUT : section entière, ancre `edition-collective`]** L'Édition collective (entreprises, écoles, associations)

> Note : la section porte l'identifiant `edition-collective` (le gabarit des pages légales sait
> le poser, `src/app/legal/types.ts:31`), pour que le lien sous la case d'accord du dépôt y mène
> directement : `/confidentialite#edition-collective`. Rédigée dans l'hypothèse A (Q8). Toute
> qualification juridique est une proposition, à faire relire.

**13.1 De quoi il s'agit.** Une organisation (« le client ») confie à Bellajour la composition et
l'impression d'un ou de plusieurs magazines de son événement (« l'édition »). Elle désigne une
personne (« le responsable ») qui suit l'édition dans un espace en ligne et peut le partager en
lecture avec son équipe. Elle invite des personnes (« les participants ») à envoyer leurs photos
par un lien. La relation avec le client est régie par les Conditions de l'Édition collective et
par l'accord de sous-traitance qui y est annexé, joints à chaque devis.

**13.2 Qui est responsable de quoi.** Pour les photos des participants, leur nom, leur adresse
e-mail et les informations qui accompagnent leurs photos, Bellajour agit pour le compte du client
et selon ses instructions : le client est responsable du traitement, Bellajour est son
sous-traitant (RGPD, art. 28). Pour ses propres données de gestion (le contact du responsable, les
échanges avec l'atelier, la facturation, le journal des actions et la sécurité de ses services),
Bellajour est responsable du traitement.

**13.3 Les données et ce à quoi elles servent.**

| Qui | Données | À quoi elles servent | Base légale |
|---|---|---|---|
| Participant | prénom, nom, adresse e-mail (non vérifiée) | reconnaître la personne d'un téléphone à l'autre et d'un lien à l'autre ; ranger ses photos sous son nom | déterminée par le client, responsable du traitement (§13.2) |
| Participant | photos ; nom du fichier ; date, heure, appareil et coordonnées GPS lus dans le fichier ; ville et pays qui s'en déduisent ; empreinte calculée sur l'image | composer le magazine ; repérer les doublons ; classer les photos par jour et par lieu | idem |
| Participant | version du texte accepté, date et heure de l'acceptation | prouver l'accord donné | idem |
| Participant | identifiant aléatoire du téléphone (§8.4) | tenir le nombre de photos par personne ; permettre au participant de supprimer les photos envoyées depuis son téléphone | idem |
| Participant | photo mise à la corbeille : date, et par qui (son auteur, le responsable, l'atelier) | la corbeille de 30 jours (§13.5) | idem |
| Responsable | nom, adresse e-mail, organisation et événement, adresse de livraison | exécuter la commande, échanger, livrer, facturer | intérêt légitime de Bellajour à exécuter le contrat conclu avec le client (6.1.f) |
| Responsable **[CONDITION : rendez-vous en ligne branchés]** | rendez-vous pris : date, sujet ; son nom et son adresse figurent dans l'invitation | organiser les rendez-vous avec l'atelier | idem |
| Responsable | identifiant aléatoire de l'appareil (§8.4), dont nous ne gardons que l'empreinte ; le cas échéant, code à usage unique envoyé par e-mail | réserver les modifications de l'espace aux appareils reconnus | intérêt légitime de sécurité (6.1.f) |
| Client, responsable | messages, pièces jointes, contenus envoyés (logo, programme, liste, réponses au questionnaire) | composer le magazine ; échanger avec l'atelier | exécution du contrat avec le client (6.1.b) ; pour les personnes nommées dans ces contenus, voir §13.2 |
| Tous | journal des actions (qui a fait quoi, quand), adresses e-mail masquées | sécurité, preuve, résolution des litiges | intérêt légitime (6.1.f) |

Bellajour ne déduit des photos aucune donnée sensible et ne réalise aucune reconnaissance des
visages (§5). Les photos ne servent qu'au magazine de l'édition : ni prospection, ni portfolio, ni
entraînement d'un modèle d'intelligence artificielle, sauf accord séparé et explicite. Le magazine
terminé n'est jamais réutilisé sans l'accord du client. Aucun e-mail n'est envoyé aux
participants : leur adresse ne sert qu'à les reconnaître.

> Note : base « déterminée par le client » : sous-traitant, Bellajour n'a pas à la choisir ; le
> client la porte (intérêt légitime, exécution d'un contrat de travail, consentement…) et
> l'accord de sous-traitance le dit. Pour le responsable, la proposition 6.1.f (et non 6.1.b)
> vient de ce que le contrat est conclu avec l'organisation, pas avec lui. Tout à faire relire.
> « Aucun e-mail aux participants » : vérifié, chaque mail des éditions part à
> `responsable_email` (`src/app/api/collectif/retrouver/route.ts:70`,
> `src/app/api/admin/collectif/editions/[id]/mail-espace/route.ts:92`,
> `.../[id]/lien/route.ts:188`, `src/lib/collectif/appareils.ts:77`). Le code à usage unique
> exige `COLLECTIF_CODE_APPAREIL` et `COLLECTIF_MAILS`, coupés aujourd'hui : d'où « le cas
> échéant ».

**13.4 Qui voit les photos.**
- l'atelier Bellajour : toutes les photos, avec le nom et l'adresse e-mail de chacun ;
- le responsable : toutes les photos de l'édition, avec le nom de qui les a envoyées ; l'adresse
  e-mail lui apparaît masquée ;
- son équipe, par le lien d'équipe : les mêmes photos et les mêmes noms, en lecture seule, sans
  aucune adresse ;
- les participants du même lien : les photos envoyées par ce lien, en image réduite, avec le
  prénom de qui les a envoyées ; jamais les photos d'un autre lien, jamais une adresse e-mail. Une
  photo envoyée avant que le texte d'accord ne l'annonce n'est montrée qu'à son auteur ;
- les lecteurs du magazine imprimé, pour les photos retenues.

L'adresse e-mail n'est pas vérifiée. Tapée par quelqu'un d'autre, elle ne donne accès à aucune
photo : elle ne montre que le prénom de la personne et le nombre de ses photos, et ne permet de
supprimer que les photos envoyées depuis son propre téléphone.

Le lien de dépôt n'est pas public : il est transmis par le client. Il n'est indexé par aucun
moteur de recherche, et son identifiant secret est retiré de l'adresse avant toute mesure
d'audience (§8.1).

> Note : vérifié dans le code du 20/10 : `src/lib/collectif/personnes.ts:56-60` (adresse masquée
> pour le responsable), `src/lib/collectif/album.ts:11` (prénom seul), la vignette seule dans
> l'album (audit S6, `CONTRAT-PERSONNES-CORBEILLE.md` §9), `VERSIONS_ALBUM`
> (`src/lib/collectif/accord.ts:67`), `vuePersonneConnue` (S1), suppression limitée au téléphone
> (`peutSupprimerSaPhoto`), `src/app/depot/layout.tsx:34-35` (noindex, no-referrer). ⚠️ Le
> projet du matin disait « ne passe jamais dans la mesure d'audience » : c'est faux, la visite
> est comptée, seul le token est retiré. Corrigé ici.

**13.5 Combien de temps.**

| Donnée | Conservation |
|---|---|
| Photos (originaux et images réduites), informations qu'elles contiennent (date, appareil, coordonnées GPS, ville, empreinte, nom du fichier), pages du bon à tirer, versions intermédiaires du magazine, contenus envoyés, pièces jointes **[CONDITION : effacement à 30 jours en service]** | supprimés 30 jours après la livraison du magazine |
| Photo supprimée par le responsable, par l'atelier ou par la personne qui l'a envoyée **[CONDITION : migration 20261023 appliquée]** | 30 jours au plus dans une corbeille, où le responsable et l'atelier peuvent la restaurer, puis effacée définitivement |
| Adresse e-mail du participant **[CONDITION : effacée par le même passage]** | effacée avec les photos, 30 jours après la livraison |
| Fichier du magazine terminé | [À FIXER : nombre d'années], pour permettre une réimpression ; jamais réutilisé sans l'accord du client |
| Preuve de l'accord du participant (nom, version du texte, date et heure) | conservée après l'effacement des photos, [À FIXER : durée], le temps qu'une réclamation sur le magazine reste possible |
| Devis signé, factures, propositions | 10 ans (Código Comercial, art. 40 ; CIVA / SAF-T) |
| Coordonnées du responsable, messages, journal des actions | [À FIXER : durée] |
| Cookies d'appareil (§8.4) | 1 an |
| Codes à usage unique | valables 24 heures ; [À FIXER : effacement des lignes] |

La livraison s'entend de la date à laquelle l'atelier la constate. L'archivage d'une édition ne
prolonge aucune de ces durées.

> Note : décisions Q4 (30 jours après « Marquer livrée », lancé avec Mathias les premières fois,
> puis chaque jour), Q5 (fichier gardé des années, durée non fixée), Q6 (10 ans, à confirmer à la
> relecture pour un client entreprise), Q7 (preuve gardée, durée à la relecture), Q2 (adresse
> effacée avec les photos), corbeille de 30 jours (`src/lib/collectif/corbeille.ts:52`, purge
> quotidienne après la relève, `src/app/api/atelier/mails/relever/route.ts:162`, cron
> `vercel.json` 7 h UTC). « Versions intermédiaires du magazine » : le code garde AUJOURD'HUI le
> PDF de chaque tour (`src/lib/collectif/retention.ts:170-174`) ; la décision Q5 ne garde que le
> magazine terminé, donc le code doit changer (`A-RELIRE.md`, partie C). Pour « coordonnées du
> responsable, messages, journal », une piste existe sans être décidée : la durée du compte
> client du §7 (3 ans après le dernier contact).

**13.6 Vos droits (participant).** Vous disposez des droits d'accès, de rectification,
d'effacement, de limitation, d'opposition et de portabilité. Pour les photos d'une édition,
adressez-vous au client qui vous a invité ; vous pouvez aussi écrire à contact@bellajour.com :
nous transmettons votre demande au client et l'aidons à y répondre. Pendant la collecte, vous
pouvez supprimer vous-même les photos envoyées depuis votre téléphone. Pour corriger votre nom,
adressez-vous au responsable de l'édition ou à contact@bellajour.com. Une photo déjà imprimée ne
peut plus être retirée du papier. Vous pouvez introduire une réclamation auprès de la CNPD
(www.cnpd.pt).

> Note : vérifié : un participant ne supprime que les photos de son téléphone, collecte ouverte
> (`src/app/depot/[token]/Album.tsx:19-22`), et ne se renomme jamais ; le responsable et
> l'atelier renomment (`CONTRAT-PERSONNES-CORBEILLE.md` §1). À faire relire : la portée du
> « retrait » de l'accord dans l'hypothèse A, et la phrase sur la photo imprimée.

**13.7 Les prestataires de l'Édition collective.** Pour l'Édition collective, Bellajour fait appel
aux prestataires suivants du §9 : Supabase (base de données), Cloudflare R2 (stockage des photos et
des fichiers), Vercel (hébergement), Brevo (e-mails au responsable), Geoapify (ville et pays à
partir des coordonnées GPS), **[CONDITION : rendez-vous en ligne branchés]** Google (agenda des
rendez-vous), et l'imprimeur des magazines [À FIXER : nom et localisation]. La liste à jour est
annexée à l'accord de sous-traitance conclu avec le client.

> Note : `R2` en juridiction UE : seule l'adresse du `.env.local` local a été lue (`.eu.r2`) ;
> celle de la Production n'est pas vérifiée. Composition des éditions : hors outil, sur Affinity
> (PRD §3, point 4), donc sur les postes de l'atelier, sans service en ligne : à confirmer par
> Mathias.

**13.8 Sur votre appareil.** Voir §8.4.

**13.9 Les mineurs.** Les participants d'une Édition collective doivent avoir 18 ans ou plus.
Avant l'ouverture de la collecte, le client confirme par écrit que toutes les personnes qu'il
invite ont cet âge. Aucune Édition collective n'est ouverte à des participants mineurs
[À FIXER après relecture juridique : le cadre d'une édition avec des participants mineurs]. Des
mineurs peuvent apparaître sur les photos : celui qui envoie une photo confirme avoir le droit de
la partager, y compris pour les personnes qu'on y voit, et le client garantit les autorisations
nécessaires.

> Note : décision Q3. Rien dans le code ne connaît l'âge d'un participant : la garantie est
> contractuelle (Conditions, accord de sous-traitance) et la confirmation écrite se range dans la
> fiche (message à Mathilde : `message-mathilde-majeurs.md`). L'âge du consentement numérique
> varie selon l'État membre (RGPD, art. 8) : à faire relire avant toute édition d'école avec des
> élèves mineurs.
