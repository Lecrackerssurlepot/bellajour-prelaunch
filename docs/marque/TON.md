# Le ton Bellajour

État au 16/11/2026. Les règles ci-dessous sont celles que Mathias a déjà tranchées, avec leur date.
**Le ton des mails ne va pas** (Mathias, 16/11) : il sera réécrit à partir de ses idées et de ses
retouches, dans la section « Le nouveau ton des mails », avant toute programmation.

## La voix

- **Une maison d'édition, pas une application.** Premium, jamais solennel. Un artisan qui travaille
  pendant que l'on vit : « Vivez. Nous composons. »
- **Vouvoiement chaleureux** sur le site et dans les mails de l'atelier. L'Édition collective suit
  le registre choisi par l'édition (vous ou tu).
- **Le ton d'un magazine, pas d'un SaaS** : jamais « Cliquez ici », jamais « Bonne réception »
  (`scripts/mails-atelier.mjs`, règle 3).
- Pas de vocabulaire promotionnel, pas de « ! », pas d'emoji (dossier Noël, 13/11).
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
| **Noël** | N1, N2, GC1, GC1b, GC2, GC2b, GC3, GC4, GC5, blocs M4 et M5 | `docs/noel-2026/MAILS.md` (brouillons) ; codes dans `src/lib/atelier/carteServeur.ts` | **rien** : aucun gabarit dans Brevo |

La forme commune des mails de l'atelier : une phrase, un bouton, aucune image dans le corps (le
logo seul ; l'image d'en-tête de C0 est l'exception voulue du 16/09). Une question ? « Répondez à
ce message, nous vous répondrons nous-mêmes. »

## Le nouveau ton des mails (à écrire avec Mathias)

Mathias juge le ton actuel des mails faux. Ce qui suit se remplit avec ses exemples et ses
retouches, puis s'applique à tous les mails, ceux de Noël d'abord.

- **Ce qui ne va pas aujourd'hui** : à recueillir.
- **Mails modèles** (les siens, collés tels quels) : à recueillir.
- **Les mots qu'on garde / les mots qu'on bannit** : à recueillir.
- **Longueur, salutation, signature** : à trancher (aujourd'hui à l'atelier : le prénom ouvre la première phrase, sans « Bonjour » ; l'Édition collective dit « Bonjour <prénom> » ; les brouillons de Noël signent « L'atelier Bellajour »).
- **Un ou deux tons** : `MAILS.md` propose « sobre » et « décontracté » pour Noël ; à trancher.

Ensuite seulement : réécrire les textes, les montrer en aperçu (`/noel-preview` partie 08 ou
`.mails-apercus/`), puis la liste d'envoi et la programmation. Aucun gabarit poussé, aucun mail de
test sans son accord, et un test ne part qu'à son adresse.
