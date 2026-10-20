# À relire, à donner, à coder : ce qui reste avant de publier les textes du 20/10

> Le sommaire de ce qui manque aux cinq projets de ce dossier, écrits le 20/10/2026 depuis les
> décisions de Mathias (Q1 à Q11 de sa page) et le code de `main` au même jour (après la PR #296).
> **Rien n'est en ligne.** Chaque texte passe en ligne séparément, sur accord explicite de Mathias,
> après la relecture juridique ; **le portugais fait foi** et sera écrit avec la relecture (aucune
> version PT ni EN n'est écrite ici).

Les cinq projets :
- `politique-confidentialite-v4-fr.md` : la politique entière, version 4, en français, changements
  marqués ;
- `accord-participant-v3.md` : le nouveau texte d'accord de la page de dépôt ;
- `conditions-edition-collective.md` : les conditions pour les entreprises ;
- `accord-sous-traitance.md` : l'accord sur les données (annexe A des conditions) ;
- `message-mathilde-majeurs.md` : le message que Mathias envoie à Mathilde (Audencia).

---

## A. Ce que la relecture juridique doit trancher

| # | Question | Où |
|---|---|---|
| A1 | **Le rôle de Bellajour** : sous-traitant de l'entreprise cliente pour les photos, noms et adresses des participants, responsable autonome pour le contact du responsable, la facturation et le journal (hypothèse A, retenue par Mathias en Q8). La qualification tient-elle ? | politique §1, §13.2 ; conditions art. 14 ; accord de sous-traitance |
| A2 | **La base légale** : « déterminée par le client » pour les données des participants ; 6.1.f (et non 6.1.b) pour les données du responsable, qui n'est pas partie au contrat ; 6.1.b pour les métadonnées des photos des particuliers. | politique §3, §13.3 |
| A3 | **La case du participant** : dans l'hypothèse A, elle n'est pas la base du traitement. « J'accepte que Bellajour utilise… » se lit-il comme un consentement retirable à tout moment ? Faut-il une autre formule (« J'ai compris que… ») ? | accord-participant-v3, §5 |
| A4 | **Le modèle d'accord** : le modèle court maison, ou les clauses contractuelles types de la Commission pour l'article 28 (décision d'exécution (UE) 2021/915) ? | accord de sous-traitance |
| A5 | **Les durées légales** : 10 ans pour les devis, factures et propositions d'un client entreprise (Q6) ; durée de la preuve de l'accord (Q7) ; délai de notification d'une violation au client ; préavis pour un nouveau sous-traitant. | politique §13.5 ; accord art. 7.6, 8.1, 10 |
| A6 | **Les mineurs** : le cadre d'une édition avec des participants de moins de 18 ans (âge du consentement numérique selon l'État membre, RGPD art. 8 ; autorisation des parents). D'ici là, aucune édition n'est ouverte à des mineurs (Q3). | politique §13.9 ; conditions 4.5 ; accord 6.3 |
| A7 | **Le DPO et l'analyse d'impact** : « pas de traitement à grande échelle » tient-il avec des éditions de milliers de photos de salariés ou d'élèves, avec leurs coordonnées GPS ? Une AIPD est-elle requise pour l'Édition collective ? | politique §1, §12 |
| A8 | **Les cookies et la mémoire du navigateur** (article 5.3 de la directive ePrivacy) : le choix jour ou nuit (`bj_ec_mode`) et le repère de dernière visite sont des conforts, pas des nécessités strictes. Faut-il un consentement ? | politique §8.4 |
| A9 | **Le contrat avec l'entreprise** : ordre de priorité des pièces, mandat du responsable (sa validation engage-t-elle le client ?), transfert des risques, délai et remèdes d'un défaut d'impression pour un professionnel, plafond de responsabilité, retard de paiement, annulation avant le bon à tirer, droit applicable, juridiction, langue qui fait foi. | conditions art. 1.3, 2.3, 8.3, 9, 10.3, 13, 16.2, 17, 18 |
| A10 | **Les droits sur les photos** : pour un usage hors du magazine (portfolio, référence), l'accord du client suffit-il, ou faut-il celui des auteurs et des personnes photographiées ? | conditions 11.1 ; politique §13.3 |
| A11 | **Le retrait** : un participant qui retire son accord avant l'impression ; « une photo déjà imprimée ne peut plus être retirée du papier ». | politique §13.6 |
| A12 | **La connexion avec Google** au compte client (en ligne depuis le 06/09) : Google y est-il sous-traitant ou responsable autonome ? | politique §3, §9 |
| A13 | **L'AI Act** : garder la phrase « pas un système à haut risque » ? La couverture « générée par IA » appelle-t-elle une information de transparence ? | politique §4 |
| A14 | **Particuliers : 90 jours contre 3 ans.** La politique promet l'effacement des photos et du fichier HD 90 jours après la livraison (Q10 : on tient la promesse) ; les CGV donnent une garantie de conformité de 3 ans dont le premier remède est la réimpression (art. 9.1 et 9.4). Une fois le fichier effacé, la réimpression est impossible. Garder le seul fichier d'impression plus longtemps, comme pour les éditions (Q5) ? À trancher AVANT de construire l'effacement. | politique §7 ; CGV art. 9 |
| A15 | **La TVA d'un client professionnel** (Portugal, autre État membre, hors Union) : avec le comptable. | conditions 10.1 |

## B. Ce que Mathias doit encore donner

| # | Ce qui manque | Pourquoi ça bloque |
|---|---|---|
| B1 | ✅ **Donné le 20/10 : 10 ans** (« on ne l'utilise pas sans leur accord ») | écrit [À FIXER] dans la politique §13.5, les conditions art. 12.1, l'accord art. 10 ; le code ne peut pas l'effacer sans ce nombre |
| B2 | **Version A ou B du texte d'accord** (la phrase de l'album fondue dans le texte, ou gardée encadrée à la fin) | décide si `decouperAccord` change |
| B3 | **L'imprimeur des éditions** (nom, pays) | politique §13.7, conditions 8.1, accord art. 8 ; aucun outil du code ne le nomme |
| B4 | **Canva** : l'atelier compose-t-il les albums des particuliers dans Canva, photos comprises ? Le code garde le lien du design de chaque dossier et le client y commente sa maquette. Si oui, Canva est un sous-traitant à déclarer, et l'effacement à 90 jours doit vider le design | politique §9 ; effacement des particuliers |
| B5 | **L'outil de la couverture** « générée par IA » des particuliers, maintenant qu'OpenAI et Fal.ai sortent de la politique (Q11) : s'il reçoit une photo ou une description du client, il entre au §9 | politique §4, §9 ; CGV 1.2, 3.1 |
| B6 | **La durée des coordonnées du responsable, des messages et du journal** des éditions (piste non décidée : 3 ans après le dernier contact, comme le compte client) | politique §13.5 |
| B7 | **Les chiffres commerciaux des conditions** (avec Louis) : tours de bon à tirer compris et prix d'un tour de plus, délai de relecture et ce qui se passe sans réponse, délai de livraison, délai de signalement d'un défaut, échéances de paiement, ce qui reste dû en cas d'annulation, durée de confidentialité, délai de force majeure, échéance des contenus | conditions art. 6.2, 7.2, 7.3, 8.2, 8.4, 10.2, 13.4, 15, 16.2 |
| B8 | **La remise d'une version numérique** du magazine au client, et ce qu'il peut en faire | conditions 11.3 |
| B9 | **Le registre des traitements** (art. 30) : existe-t-il ? La politique dit que oui | politique §12 |
| B10 | **Appliquer la migration `20261023`** (adresse des participants, corbeille, album, ouverture), puis vérifier en SQL qu'elle a bien créé ses tables | sans elle, ni le champ d'adresse ni sa phrase ne s'affichent ; la corbeille ne se purge pas |
| B11 | **Le premier effacement à 30 jours, avec lui** (Q4), puis l'accord pour qu'il passe tout seul chaque jour | la phrase « supprimées 30 jours après la livraison » n'est vraie qu'à ce prix |
| B12 | **Envoyer le message à Mathilde**, et ranger sa réponse dans la fiche de l'édition | Q3 ; la clause demande une confirmation écrite |
| B13 | **Les rendez-vous en ligne** : `GOOGLE_AGENDA_COMPTE` sera-t-elle posée ? | la ligne Google (Agenda) ne se publie que ce jour-là |
| B14 | **Vérifications de fait** : juridiction UE du coffre R2 en production (seule l'adresse locale a été lue), versions et sauvegardes du coffre et de Supabase, durée des journaux de Brevo et de Vercel, entité et localisation de Geoapify, cadre du compte Google, DPA acceptés chez Geoapify, Google et Canva | politique §9, §13.7 ; accord art. 7.4, 8 |

## C. Ce que le code doit faire pour que chaque texte soit vrai

Rien de ceci n'est fait par ces projets. Chaque ligne nomme le texte qu'elle rend vrai.

### L'Édition collective

| # | À faire | Rend vrai | État le 20/10 |
|---|---|---|---|
| C1 | Appliquer `20261023` (Mathias) et vérifier la donnée qui arrive | champ d'adresse et sa phrase ; album ; corbeille | non appliquée (`ETAT-PRODUCTION.md`, 20/10 fin d'après-midi) |
| C2 | Faire tourner l'effacement à 30 jours : premières fois avec Mathias (`scripts/collectif-retention.ts --jours 30 --vraiment`), puis un passage quotidien automatique, comme la purge de la corbeille après la relève | « supprimées 30 jours après la livraison » (accord, politique §13.5, conditions 14.3, accord de sous-traitance art. 10) | script prêt, jamais lancé avec `--vraiment`, pas de cron (T-159) |
| C3 | Les prérequis du premier `--vraiment` (T-159) : les écrans de l'espace et de la fiche lisent `photos_supprimees_le` ; une procédure pour les lots téléchargés par l'atelier et les fichiers de composition ; vérifier versions et sauvegardes ; effacer le nom d'origine resté dans `cle_fichier` | idem | à faire |
| C4 | Ne garder que le PDF du **dernier tour de chaque magazine validé** ; effacer à 30 jours les PDF des tours intermédiaires ; puis une seconde règle qui efface le fichier gardé au bout de [B1] années | « dont seul le fichier est gardé pour une réimpression » ; politique §13.5 « versions intermédiaires » | faux : `FAMILLES` garde le PDF de chaque tour (`retention.ts:170-174`) |
| C5 | Effacer l'adresse des participants dans le même passage : `email` est `not null` (`20261023:91`), donc supprimer les lignes `collectif_participants` de l'édition (les photos gardent leur nom, `participant_id` passe à null, `20261023:144` ; les téléphones rattachés partent en cascade, `20261023:126`) | Q2, « effacée avec les photos » | faux : jamais purgée (contrat §9, C3) |
| C6 | Décider des adresses masquées (« l•••@audencia.com ») gardées au journal (`participant_retrouve`, `participant_nom_different`…) : les retirer au même passage, ou le dire dans la politique | idem | à décider |
| C7 | Les lignes de `collectif_codes` et `collectif_appareils`, jamais purgées : une règle, quand [B6] et la durée des codes seront fixées | politique §13.5 | à faire |
| C8 | Le texte d'accord : une nouvelle entrée de `TEXTES_ACCORD` (un jour strictement après `2026-10-20`), `VERSION_ACCORD` basculée, la nouvelle version AJOUTÉE à `VERSIONS_ALBUM` (sinon l'album des nouveaux participants reste vide, en silence), les vérifications du harnais mises à jour, `decouperAccord` selon [B2], le lien « Comment Bellajour traite vos / tes données » vers `/confidentialite#edition-collective` dans un nouvel onglet | accord-participant-v3 | à faire, le jour où Mathias valide |
| C9 | La politique v4 publiée AVANT le texte d'accord, avec l'identifiant de section `edition-collective` (le gabarit le sait déjà, `src/app/legal/types.ts:31`) | le lien sous la case | à faire |
| C10 | Une épreuve du harnais : aucun mail des éditions ne part à une adresse de participant (aujourd'hui vrai : tous partent à `responsable_email`) | « Nous ne vous écrirons pas pour autre chose » | proposé |
| C11 | Proposé, non décidé : dans la fiche de l'atelier, une case « majorité des participants confirmée par écrit » avant d'ouvrir la collecte | politique §13.9 ; conditions 4.5 | proposé |

### Les particuliers

| # | À faire | Rend vrai | État le 20/10 |
|---|---|---|---|
| C12 | Construire l'effacement 90 jours après la livraison (Q10), sur le modèle de `collectif-retention.ts` : date de départ lue au journal (signal de livraison ou « Marquer livrée »), photos et fichier HD effacés, lancé avec Mathias les premières fois. **Après** la réponse à A14 (garantie de 3 ans) et à B4 (le design Canva) | politique §7, première ligne (phrase exacte écrite au projet) | n'existe pas : l'anonymisation épargne tout dossier payé ou livré (`retention.ts:117-124`) |
| C13 | L'anonymisation des dossiers laissés sans suite n'a ni cron ni route (`scripts/anonymiser-dossiers.ts`) : un passage régulier, si la politique l'annonce | politique §7, ligne ajoutée (déjà promise aux CGV art. 4 bis.2) | manuel |
| C14 | Rien à retirer du code pour Q11 : ni Rekognition, ni OpenAI, ni Fal.ai n'y sont (vérifié dans `src/` et `package.json`) | politique §3, §4, §5, §9, §11, §12 | rien à faire |

## D. Les autres textes légaux à corriger dans le même lot

Ce sont des textes légaux distincts : chacun demande l'accord explicite de Mathias, en trois
langues, le portugais d'abord. Ils ne sont PAS réécrits ici.

- **CGV, art. 3.2** : décrit le regroupement des photos par reconnaissance des visages et son
  consentement biométrique. À retirer avec Q11.
- **CGV, art. 11.3** : « La reconnaissance des visages est également effectuée au sein de l'UE »,
  et des prestataires établis aux États-Unis pour la couverture (OpenAI, Fal.ai). À corriger avec
  Q11 et B5.
- **CGV, art. 1.2 et 3.1, mentions légales §3** : « couverture illustrée générée par IA ». Dépend
  de B5.
- **Mentions légales, §9** : « (y compris l'analyse automatisée des photos et la reconnaissance des
  visages) ». À corriger avec Q11.
- **CGV, art. 9 contre politique §7** : voir A14.
- **CGV, art. 13.7** : renvoie à une « Politique cookies, accessible via le bandeau de
  consentement », qui n'existe pas (`LOT-JURIDIQUE.md`, point 8).

## E. Relevé en passant, non tranché, texte inchangé dans le projet

- Politique §4 : « tri, scoring de qualité, sélection et mise en page » automatisés ; le code range
  et signale, l'atelier choisit et compose.
- Politique §6.2 : « des durées de conservation renforcées » pour les photos d'enfants : aucune
  n'existe.
- Politique §8.1 : le bandeau de consentement et le pixel Meta n'existent pas dans le code
  (`LOT-JURIDIQUE.md`, points 8 et 9) ; Speed Insights n'est pas mentionné (réserve finale du même
  fichier).
- Politique §10 : « authentification forte interne » (mot de passe et cookie signé, pas de second
  facteur dans le code), « journalisation des accès » (le journal trace les écritures, pas les
  lectures), « chiffrement au repos » (à confirmer chez les fournisseurs).
- Politique §12 : « Le service est proposé au sein de l'Union européenne », alors que les
  particuliers sont livrés aussi aux États-Unis et au Brésil (CGV art. 4 bis.6).
- Politique §3 : la version des CGV acceptée n'est stockée nulle part (`LOT-JURIDIQUE.md`,
  point 11).
- La page de dépôt n'existe qu'en français : si une édition invite des participants non
  francophones, le texte d'accord devra exister dans leur langue.

## F. La ponctuation

La version en ligne porte des tirets cadratins qui tiennent lieu de ponctuation (« 10 ans —
obligation comptable… », « Consentement (art. 6.1.a) — voir §8 », « Version 3.1 — En vigueur… »).
Le projet les garde tels quels là où le texte ne change pas, pour que la comparaison mot à mot
reste possible ; les passages nouveaux ou réécrits n'en ont aucun. Les remplacer partout (deux-points,
virgule, point), comme le veut la règle des tirets, ne change aucun sens mais touche un texte
légal : à décider par Mathias avec la mise en ligne, dans les trois langues.

## G. Tous les [À FIXER] des cinq projets

**Politique (v4)** : date de mise en ligne ; durée du fichier du magazine terminé (§13.5) ; durée
de la preuve de l'accord (§13.5) ; durée des coordonnées du responsable, des messages et du journal
(§13.5) ; effacement des lignes de codes (§13.5) ; nom et localisation de l'imprimeur des éditions
(§13.7) ; cadre d'une édition avec des participants mineurs (§13.9). À vérifier : entité et
localisation de Geoapify, de Google (connexion et agenda), de Canva ; leurs transferts hors UE.

**Accord du participant (v3)** : le nom de la version (jour de mise en ligne, après `2026-10-20`).

**Conditions de l'Édition collective** : numéro et date de version ; ordre de priorité des pièces
(1.3) ; nombres de photos au devis (5.1) ; échéance des contenus (6.2) ; tours compris et tour de
plus (7.2) ; délai de relecture et absence de réponse (7.3) ; imprimeur (8.1) ; délai de livraison
(8.2) ; transfert des risques (8.3) ; délai de signalement (8.4) ; défaut caché et autres remèdes
(9.1) ; TVA (10.1) ; échéances (10.2) ; retard de paiement (10.3) ; accord requis pour un autre
usage (11.1) ; version numérique (11.3) ; durée du fichier (12.1) ; plafond de responsabilité
(13.1) ; durée de force majeure (13.4) ; durée de confidentialité (15) ; annulation (16.2) ; droit
et juridiction (17) ; langue qui fait foi (18).

**Accord de sous-traitance** : cadre des mineurs (6.3) ; juridiction UE du coffre, chiffrement au
repos, sauvegardes (7.4) ; délai de notification d'une violation (7.6) ; conditions d'audit (7.7) ;
préavis et effet d'une opposition à un nouveau sous-traitant (8.1) ; localisation de Geoapify, de
Google, nom de l'imprimeur (8.1) ; durée du fichier du magazine, durée de la preuve, format de
remise des photos (10) ; plafond (11) ; droit et juridiction (12).
