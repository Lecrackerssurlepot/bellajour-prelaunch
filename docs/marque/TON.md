# Le ton Bellajour

État au 16/11/2026. Les règles ci-dessous sont celles que Mathias a déjà tranchées, avec leur date.
Le nouveau ton des mails est **validé le 16/11** (section « Le ton des mails ») ; les mails de Noël
l'appliquent, ceux de l'atelier le prendront à leur prochaine réécriture.

## La voix

- **Une maison d'édition, pas une application.** Premium, jamais solennel. Un artisan qui travaille
  pendant que l'on vit : « Vivez. Nous composons. »
- **Vouvoiement chaleureux** sur le site et dans les mails de l'atelier. L'Édition collective suit
  le registre choisi par l'édition (vous ou tu).
- **Le ton d'un magazine, pas d'un SaaS** : jamais « Cliquez ici », jamais « Bonne réception »
  (`scripts/mails-atelier.mjs`, règle 3).
- Pas de vocabulaire promotionnel. Sur le site : ni « ! » ni emoji. Dans les mails (16/11) : emoji
  libres, un « ! » au plus par mail. Noël : un emoji de saison dans l'objet (🎄 🎁 ✨), aucun dans
  ceux qui parlent d'argent ou tombent hors saison (rappel de fin, remboursement).
- On dit « magazine » et « numéro », jamais « album » (le skill « bellajour-mail » qui dit « album » est périmé).

## Les règles d'écriture, toutes tranchées

| Règle | Depuis | Détail |
|---|---|---|
| **Masculin générique** | 01/09 | le client, le fondateur, il, inscrit. Jamais cliente, fondatrice, elle. Ne pas toucher l'invisible (clés d'événements, noms de fichiers, textes légaux portugais) |
| **Pas de cadratin qui tient lieu de ponctuation** | 08/09 | énumération ou explication : deux-points ; deux phrases : point ; continuation : virgule ; bouton ou message d'état : jamais de cadratin (« Payer 40 € »). Restent légitimes : les `<title>`, les `aria-label`, l'incise encadrée des deux côtés. **Dans les mails : aucun tiret du tout** (vérifié par le script avant envoi) |
| **Textes courts comme une application** | 26/10 | titre de 1 à 4 mots, message d'état de 2 à 6 mots, une ligne d'aide seulement si l'écran ne se comprend pas sans elle, jamais pour raconter le système. Couper jusqu'à ce que plus un mot ne puisse partir |
| **Moins de boutons** | 21/10 | un bouton qui peut être remplacé, déplacé, ou qui ajoute une étape n'a pas sa place. Rien de répété sur chaque vignette |
| **Un geste de texte n'est jamais souligné** | 21/10 | c'est une petite pilule douce |
| **Les phrases du questionnaire `/composer` sont des correctifs** | 25/08 → 17/10 | chacune répare une perte mesurée sur un vrai dossier ; ne pas les réécrire « pour faire plus court » sans Mathias (`src/app/CLAUDE.md`) |
| **Aucun chiffre inventé** | socle | un prix, un délai, un grammage sans source est un mensonge au client. Les nombres des mails sont LUS dans le code (`mails-atelier.mjs` lit `livraison.ts` et `exemplaires.ts`) |
| **Un texte légal ne change pas** sans l'accord explicite de Mathias | socle | CGV, confidentialité, mentions |

## Les mails : où vit chaque texte

Le texte d'un mail est versionné dans le dépôt, jamais écrit dans l'interface Brevo. Brevo reçoit
le gabarit (`--pousser --seulement <CODE>`), rien d'autre.

| Famille | Codes | Le texte vit dans | Part |
|---|---|---|---|
| Atelier (le numéro) | M0, M1, M2, M2b, M3, M3b, M4, M5, M5c, M6, M7, M7b, M8, M9, M10 | `scripts/mails-atelier.mjs` | oui, en production |
| Compte | C0, C1, C2 | `scripts/mails-atelier.mjs` | oui |
| Relances manuelles | RD*, RP*, RA* | rejouent M2, M2b ou M3b (`src/lib/atelier/relance.ts`) | oui, au clic de l'atelier |
| Édition collective (B2B) | rendez-vous et espace | `src/lib/collectif/mailsTextes.ts`, `mailsRdv.ts` | coupé tant que `COLLECTIF_MAILS` n'est pas ouvert |
| Prévente (archivée) | W1, P1, F1, S1, A1 à A3, RELANCE | gabarits Brevo, routes `api/waitlist`, `api/webhook`, `api/ambassadeur` | préventes closes depuis le 01/09 |
| **Noël** | N1 à N4 (campagnes), GC1, GC1b, GC2, GC2b, GC4, GC4b, GC5, GC6, GC7 ; bloc carte et crédit de M4 | `scripts/mails-noel.mjs` (M4 : `mails-atelier.mjs`) ; envois dans `src/lib/atelier/carteServeur.ts` | **rien encore** : gabarits à pousser sur l'accord de Mathias |

La forme commune des mails de l'atelier : une phrase, un bouton, aucune image dans le corps (le
logo seul ; l'image d'en-tête de C0 est l'exception voulue du 16/09). Une question ? « Répondez à
ce message, nous vous répondrons nous-mêmes. »

## Le ton des mails (validé le 16/11)

Validé sur l'artefact « Mails de Noël » (16/11). Tiré de ses brouillons et du Guide Notion de mai.

- **Ouvrir par une vie** : un moment, une personne, un voyage. Jamais le produit en premier.
  Avant : « Une carte cadeau, valable douze mois, pour offrir un magazine… ». Après : « Votre sœur
  rêve de garder son dernier voyage ? Offrez-lui le magazine. »
- **Une idée par bloc**, et **chaque bloc ramène** vers une page précise (`/offrir`, `/composer`,
  la carte, le compte), jamais l'accueil.
- **Un seul bouton**, avec un verbe (« Offrir une carte », « Choisir mes photos »).
- **Les conditions en bas** : un « À noter » de trois puces au plus, puis « Toutes les conditions »
  vers `/offrir#conditions`.
- **Les montants en lignes** : le récapitulatif de `STRUCTURE-INFO.md`.
- **Nous, vous** : « nous » de l'atelier, vouvoiement, masculin générique, aucun tiret.
- **Les mots** : magazine, numéro, composer, confier. Jamais album, profitez, cliquez ici, magique.
  « Votre carte a servi » est refusé (« moche ») : on dit ce qu'elle a fait (« La carte de Léa a
  offert votre numéro »).
- **Emoji** : libres. **« ! »** : un au plus par mail. **Un seul ton** (pas de sobre / décontracté).
- **Signature** : « L'atelier Bellajour ».
- **Images** : toutes s'apparentent à des magazines (Mathias, 16/11). Une couverture est posée
  comme un objet (reliure, tranche, ombre : `scripts/images-mails-noel.mjs`), jamais recadrée en
  bandeau. La carte cadeau est dessinée en HTML (visible même quand Gmail masque les images).

Le squelette commun : logo · image · titre (2 à 5 mots) · évocation (1 ou 2 phrases) · blocs avec
leur lien · un bouton · À noter · signature. Un mail court saute des blocs, il n'en invente pas.
Le script vérifie la forme avant tout aperçu ou poussée (tirets, « ! », « album », entités dans
l'objet, conditionnelles équilibrées).

Aucun gabarit poussé, aucun mail de test sans l'accord de Mathias, et un test ne part qu'à son
adresse.
