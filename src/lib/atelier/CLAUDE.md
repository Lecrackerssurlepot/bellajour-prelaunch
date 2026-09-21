# L'Atelier — la machine

Chargé dès qu'on touche un module de l'atelier. C'est le cœur du produit : un numéro traverse
neuf états, et à chaque passage un mail part vers une vraie cliente.

## Deux fichiers purs portent les règles. On ne les contourne pas.

- **`transitions.ts`** — LA table des gestes autorisés : depuis quel état, vers quel état, quel
  patch. Ajouter une action = **une entrée ici**, jamais un nouveau fichier. Le mail annoncé par
  l'écran est DÉRIVÉ de `codesPour`, jamais déclaré à la main : une déclaration manuelle mentait
  déjà sur 3 actions sur 7.
- **`urgence.ts`** — les délais qu'on promet à la cliente, et le tri de la table de travail.
  `QUI_ATTEND` est lu par l'admin ET par la page cliente : les deux écrans ne peuvent donc pas se
  contredire. Changer une valeur ici sans changer la page publique, c'est mentir à l'une des deux.

- **`fondatrice.ts`** — le crédit de 30 € des quatorze fondatrices (CGV art. 5 bis), et son
  raisonnement de sécurité en tête de fichier. Deux appelants, une seule logique :
  `/api/atelier/checkout` (la remise s'applique **d'office**, la cliente ne tape rien) et
  `/api/admin/atelier/fondatrice-code` (le filet manuel). ⚠️ L'unicité est portée par
  `max_redemptions: 1` chez Stripe (l'autorité) ET par `evenements`, **indexé par
  `numero_fondateur`, jamais par dossier** : le crédit appartient à la personne, pas au magazine.
  ⚠️ Stripe **interdit `discounts` et `allow_promotion_codes` sur la même session** : poser les
  deux empêche la cliente de payer.

- **`retention.ts`** — les 90 jours de rétention (T-076, décision de Mathias du 01/09) et le
  préavis à J-7. `RETENTION_JOURS` et `PREAVIS_JOURS` sont les deux seuls réglages, `PREAVIS_A_JOURS`
  en est **dérivé**. **Deux populations, deux horloges** : le dépôt jamais terminé se compte depuis
  la dernière activité ; le dépôt terminé jamais payé (dont l'aperçu publié) se compte **depuis la
  date du dépôt**. ⚠️ Cette date **n'est pas une colonne** : `consent_photos` n'a pas d'horodatage,
  elle vit dans `evenements` type `consentements` (même source que `donnees.ts` T2-5 et `mesure.ts`).
  Sans elle, **on ne ferme pas** (`depot_sans_date`) — `created_at` est antérieur au dépôt et
  `etat_maj_le` peut lui être bien postérieur, aucune des deux n'est la bonne.
  Restent absolus : jamais un dossier payé, jamais un état engagé (`ETATS_ENGAGES`), jamais deux
  fois, **jamais sans préavis M10 vieux de 7 jours**. ⚠️ La garde « payé » est **double** parce
  qu'un fondateur dont le crédit couvre tout le prix (20 à 28 pages depuis la grille du 10/09) n'a
  **aucun `payment_intent`** : c'est l'état qui la sauve.
  Les dates hors `numeros` transitent par le type `Jalons`, chargées par `lireJalons` (mails.ts)
  **uniquement** pour les dossiers retenus par `meriteUnRegardDeRetention` — un pré-tri qui calcule
  sur un majorant, donc ne peut rien laisser passer. Le module qui AGIT est
  `scripts/anonymiser-dossiers.ts`, et lui seul : aucune route web, aucun cron.

- **`relance.ts`** — la relance MANUELLE (T-109, 11/09/2026), celle que l'atelier déclenche.
  Pur. Le motif se DÉDUIT de l'état (dépôt vide → RD*, photos sans accord → RP*, aperçu non payé
  → RA*), il n'est jamais saisi : un écran qui choisit ce qui part enverrait « il manque vos
  photos » à quelqu'un qui les a déposées ce matin. ⚠️ **Une relance manuelle n'a AUCUN gabarit
  Brevo à elle** : `MODELE_RELANCE` la fait rejouer M2, M2b ou M3b, et `modeleDe()` (mails.ts)
  route gabarit, objet, `manquePour` et `parametresPour` vers ce modèle. Ce qui empêchait de
  renvoyer une relance n'était pas son texte, c'était le verrou unique de `mails_envoyes` : le
  code porte donc le RANG (RP1, RP2, RP3). Quatre refus, tous avec une phrase lisible : adresse
  absente, adresse qui a rebondi, plafond `RELANCES_MAX` par motif, `DELAI_MIN_RELANCE_MS` depuis
  le DERNIER mail quel qu'il soit. Ces deux constantes sont des réglages par défaut, pas des
  décisions de Mathias.

Les autres purs : `grille.ts` (**la** grille, un prix HORS TAXES par nombre de pages de 24 à 60,
`ttcCentimesPour(pages, pays)` = HT × (1 + TVA du pays) arrondi à l'euro ; importable navigateur,
source de tout affichage ; sans pays, c'est la France), `prix.ts` (le calcul serveur :
`centimesDuDossier` lit le TTC GELÉ `prix_centimes` d'abord, le HT gelé `prix_ht_centimes`
converti ensuite, la grille en dernier ; `ttcPourPays` recalcule quand le client change de pays),
`pays.ts` (les 32 destinations, `TAUX_TVA_PAYS`, `HORS_UE`), `exemplaires.ts` (1 à 10 exemplaires,
le 2e à −30 %, les suivants à −50 %, importable navigateur : le bon de commande le joue en direct),
`livraison.ts` (zones A 5 € / B 13 € / C devis, `FRANCO_CENTIMES` 50 €, `portClient`, devis → TTC,
`totalCommande`), `questionnaire.ts` (les 7 champs exigés, pays compris, + `suggestionEmail`), `rebond.ts` (ce qu'un signal Brevo dit d'une adresse),
`parcours.ts` (les 8 jalons), `impression.ts` (table produit Cloudprinter, **le papier tranché
le 11/09 — `PAPIER_INTERIEUR` / `PAPIER_COUVERTURE`, une constante pour les deux reliures —, le
pelliculage choisi par le client, et la GÉOMÉTRIE du dos qui se déduit du papier**),
`suivi.ts` (transporteur + code), `rang.ts` (le rang d'une photo : celui que le navigateur
annonce fait foi, les ajouts se rangent après le coffre), `recit.ts`, `brief.ts`, `lot.ts`, `formats.ts`, `dates.ts`,
`token.ts` / `tokenForme.ts` (jumeau navigateur), `secret.ts`.
Les modules à effets : `mails.ts`, `r2.ts`, `cloudprinter.ts`, `paiement.ts`, `evenements.ts`,
`apercu.ts`. La règle de séparation est volontaire : **tout ce qui est testable sans réseau l'est**,
et `scripts/verif-atelier.ts` le prouve à chaque exécution.

## Les mails — trois garanties, dans cet ordre

`mails.ts → envoyerMailAtelier(supabase, code, numero)`, codes M0 → M10.
1. **Jamais un mail qui tombe sur une page vide** : `manquePour()` vérifie les données avant tout.
2. **Jamais deux fois** : l'insertion dans `mails_envoyes` (unique `numero_id`+`code`) EST le
   verrou, posée AVANT l'appel Brevo.
3. **Un échec Brevo retire le verrou** et journalise `mail_echec` ; la relève suivante réessaie.

⚠️ **Garde-fou de chaîne** : un mail ne part QUE si son prédécesseur est parti. Motivé par un cas
réel — un dossier « validée » sans aucun mail recevait « part à l'impression ». Seul M2 n'a pas de
prédécesseur ; il porte la seule borne de date, réglable par `ATELIER_M2_DEPUIS`.
**M10 est la seconde exception, et pour la raison inverse** : un dossier de trois mois à qui aucun
mail n'est jamais parti est précisément celui qu'il ne faut pas refermer en silence. Il n'a pas de
borne de mise en service non plus, sinon plus rien ne s'anonymiserait jamais.
⚠️ **Sans `BREVO_TEMPLATE_M10_ID`, la rétention de 90 jours ne s'applique pas du tout** :
le script refuse de refermer un dossier qui n'a pas été prévenu (`preavisRespecte`).

⚠️ **M0 est programmé, pas envoyé** (T-116, 17/09/2026) : `envoyerMailAtelier(..., { differeMs })`
passe `scheduledAt` à Brevo (+15 min), journalise `mail_programme` avec le `messageId`, et pose le
verrou comme pour un envoi. `annulerMailProgramme` (première photo confirmée, ou clic « Envoyer à
l'atelier ») fait le `DELETE` chez Brevo et journalise `mail_annule` ; **le verrou reste posé** : un
M0 annulé ne repart jamais, M1 ou M2b prennent le relais. Le module pur `programme.ts` porte le
délai, l'encodage de l'identifiant et le choix du message à annuler. Le filet de la relève ne
rattrape que la programmation qui a ÉCHOUÉ (verrou retiré), toujours borné par D16.

⚠️ **La relève doit tourner tous les jours** (`vercel.json`, 7 h UTC). Sans elle, M2, M3b, M8 et
l'auto-validation à J+7 ne partent JAMAIS. Le plan Hobby ne sait pas faire mieux qu'une fois par
jour, et il déclenche « dans l'heure qui suit » : tout mail à retardement arrive donc entre 0 et
24 h APRÈS le délai qu'on annonce à la cliente. La cadence horaire vit dans
`.github/workflows/releve-mails.yml` — **inerte tant que son secret n'est pas posé sur le dépôt**.

⚠️ **M4 est le seul mail que la relève RÉPARE dans un état qu'elle ne balaie pas pour lui-même**
(`doitRattraperM4`). Il part au webhook Stripe ; s'il échoue, plus rien ne repassait derrière, et
comme M5 l'exige, le dossier PAYÉ se figeait pour toujours. La réparation exige la PREUVE de
l'échec (`mail_echec` dans le journal) : un état forcé à la main ne déclenche rien.

⚠️ **Si `BREVO_TEMPLATE_<CODE>_ID` manque, le mail est sauté SANS poser le verrou** : il sautera
de nouveau à chaque relève, indéfiniment, sans erreur. `/admin/atelier/sante` est le seul endroit
qui le montre. Le texte des mails est versionné dans `scripts/mails-atelier.mjs`, pas dans Brevo.

⚠️ **Aucun tiret (—, –) dans les textes de mails.** Consigne explicite de Mathias.

## Les signaux qui ne veulent pas dire ce qu'on croit

- **`consent_photos` est le SEUL signal de dépôt terminé.** Pas `nb_photos > 0` : les photos
  montent sur R2 au fil de l'eau, donc un dossier peut afficher 55 photos et n'être jamais envoyé.
  Un incident réel : l'atelier s'apprêtait à composer sans droit d'usage des photos.
  `etapeDepot(consentPhotos, nbPhotos)` rend `termine` | `vide` (M2) | `abandonne` (M2b).
- **`retouches_demandees_le` suspend l'auto-validation.** `doitAutoValider` refuse tant que la
  colonne est posée : imprimer par-dessus des demandes de correction est le silence qui coûte.
  La reprise = REPUBLIER la maquette, ce qui remet la colonne à null et lève le verrou M5.
- **L'état s'appelle `photos_recues` avant qu'aucune photo n'arrive.** Le tag « dépôt non terminé »
  de l'admin lève la contradiction. Ne pas changer la valeur de l'enum pour un problème d'affichage.
- **Un mail « envoyé » n'est pas un mail arrivé.** `rebond.ts` porte la règle : `hard_bounce`,
  `blocked` et `invalid_email` → l'adresse est morte ; `spam` → elle a REÇU, c'est autre chose
  (deux phrases distinctes dans le journal, sinon on appelle une cliente pour lui dire qu'on
  n'arrive pas à la joindre) ; `soft_bounce` et `deferred` → ignorés, temporaires, Brevo réessaie.
  Les graphies `snake_case` (payload) et `camelCase` (config du webhook) sont normalisées.
  ⚠️ `invalid` ET `invalidemail` sont acceptés tous les deux : on s'abonne au premier, la doc
  nomme le second, et rien ne permet de savoir lequel arrive. Ne pas « nettoyer » ce doublon.
- **`suggestionEmail` corrige en Damerau, pas en Levenshtein.** L'inversion de deux lettres
  voisines est la faute la plus fréquente et Levenshtein la compte pour DEUX : à un caractère de
  plafond, le garde-fou ratait `gmial.com`, le cas nº1 qu'il visait. ⚠️ Plafond à UN caractère, et
  on SUGGÈRE sans jamais bloquer : à deux, on « corrige » `free.fr` en `live.fr`.

## Paiement et impression

- **Le prix est TOUJOURS calculé côté serveur** depuis `prix.ts`. Le navigateur n'envoie que le
  token. Pas de `price_id` Stripe : une seule source de vérité, pas de dérive test/prod.
- **La remise fondatrice aussi vient du serveur** (`fondatrice.ts`, 01/09) : la ligne `waitlist`
  est relue à l'instant du clic, jamais crue depuis un écran ; depuis le 10/09, si l'email ne
  correspond pas, le journal `fondateur_rattache` (geste d'admin) désigne la ligne `waitlist`.
  Le code frappé vit au journal (`code_fondatrice_cree`, le PREMIER gagne) ; un code que Stripe
  dit « exists in test mode » est déclaré `code_fondatrice_invalide` puis remplacé par un code
  live (19/09) : le journal ne s'efface jamais, il se dépasse. Depuis le 19/09 le journal porte
  le `mode` (`livemode` Stripe) de chaque code et le compare au préfixe de `STRIPE_SECRET_KEY`
  (`modeStripe`) AVANT d'appeler Stripe. **Un fondateur reconnu dont le crédit ne peut pas être
  posé ne voit JAMAIS un plein tarif** : le checkout rend 409 `credit_indisponible`, journalise
  `credit_fondatrice_indisponible`, la page cliente le dit ; Marjorie a vu 52 € au lieu de 17 €
  le 19/09, c'est la dernière fois.
  ⚠️ De 20 à 28 pages (25 à 31 €), le crédit de 30 € couvre TOUT le prix : la session Stripe
  tombe à zéro, se solde en `no_payment_required`, le dossier n'a alors **aucun `payment_intent`**,
  et le surplus de crédit est perdu (règle commerciale non tranchée par Mathias).
- **Le prix est GELÉ sur le dossier** à la publication de l'aperçu (`prix_centimes`,
  `livraison_centimes`, `livraison_niveau`, `pays_livraison` ; migration 20260910). Tout lecteur
  d'argent passe par `centimesDuDossier` : changer `grille.ts` ne change jamais un aperçu déjà
  annoncé. La livraison n'a **aucun repli** : sans montant gelé, le checkout refuse.
- **Le prix dépend du pays depuis le 15/09/2026** (grille HT × TVA du pays, `pays.ts`) : le pays est
  demandé à l'écran 4 du questionnaire (retiré le 11/09, revenu le 15/09, décision de Mathias), gelé
  avec le HT et le TTC à la publication, et le client peut en changer sur `/numero` (prix et port
  recalculés par `/api/atelier/livraison`). Zone : UE 27 + GB (20 %), CH, NO, US, BR (à 0, douane au
  client). TVA : `automatic_tax` + prix TTC calculé PAR NOUS — Stripe Tax est inerte tant que l'OSS
  n'est pas immatriculé chez Stripe, puis s'active sans redéploiement.
- **La livraison est une zone à prix fixe** (A 5 €, B 13 €, TTC partout) ou le devis du jour (zone C),
  `livraison_centimes` gèle le BRUT et le seuil de 50 € se rejoue à chaque lecture (`totalCommande`),
  parce que le client peut changer le nombre d'exemplaires après la publication. Le devis Cloudprinter
  ne sert plus qu'au NIVEAU d'expédition en zone A/B (son échec n'empêche pas de publier).
- **Les exemplaires** (`numeros.quantite`, 1 à 10, PATCH de `/api/atelier/numero`, écriture SANS
  repli comme `finition`) : une ligne Stripe par rang, `count` chez Cloudprinter, `totalPour` applique
  le dégressif d'`exemplaires.ts`.
- **La matière est tranchée depuis le 11/09** (T-027, gloss depuis le 15/09) : intérieur `pageblock_130mcg`, couverture
  `cover_250mcs`, et un PELLICULAGE choisi par le client — `finish_gloss` ou `cover_finish_matte`,
  sans supplément (relevé : un demi-centime d'écart). C'est le SEUL paramètre d'impression que le
  client choisisse ; le format, la reliure et le papier se déduisent de sa pagination. Il vit dans
  `numeros.finition` (migration `20260911`, appliquée le 16/09), se choisit au
  bon de commande de `/numero`, et entre dans le devis COMME dans la commande par une seule
  construction (`optionsItem`) — deux listes recopiées auraient chiffré un objet et commandé un
  autre. ⚠️ `cover_finish_gloss` n'existe pas chez eux : ne pas « harmoniser » l'asymétrie.
- **Les PDF déposés sont RECOUPÉS dans le navigateur de l'atelier** (T-121, 18/09/2026) : la règle
  est pure dans `decoupe.ts` (nature d'une page d'export d'après sa TrimBox, plan du bloc en pages
  simples de 216 × 303 dont la réserve côté couture est le PROPRE bord de la page étiré, jamais la
  page voisine : décision de Mathias du 19/09, ne pas revenir à l'usage InDesign sans lui ; plan de la
  couverture avec le dos inséré à `largeurCouvertureMm`, intérieur de couverture vierge au dos + 3 mm), l'assemblage
  pdf-lib dans `src/app/admin/atelier/[token]/preparerPdf.ts`, jamais sur le serveur (130 Mo).
  ⚠️ Cloudprinter attend des pages SIMPLES dans l'ordre de lecture (gabarit `book` = une page) et
  `total_pages` = le compte du fichier : un export en doubles pages est faux même s'il « se voit »
  bien. `envoyer_impression` relit chaque PDF du coffre (`controlePdf.ts`) et REFUSE un format faux.
  **`bords.ts` (pur, 21/09) mesure le fond perdu de chaque page rendue** : « touche la coupe » se
  juge à 245 (visible), « jusqu'où ça déborde » s'arrête au PAPIER (≥ 254) : un ciel clair à 248 est
  de la photo, pas du blanc (trois fausses alertes sur la couverture de Merisa avec un seul seuil).
  Un débord court ne compte que sur 2 mm de bord d'un seul tenant (un reflet cramé n'est pas une
  photo qui s'arrête). Le rendu est dans `src/app/admin/atelier/[token]/rendreBords.ts` (pdf.js
  servi depuis `public/pdfjs/`, jamais empaqueté), le module pur ne voit que des pixels gris.
- **Le dos se CALCULE** (`dosMmPourPages`), grammage et bulk déduits de `PAPIER_INTERIEUR` :
  changer le papier change la géométrie, et le harnais tombe au lieu de se taire. `souvenir.ts`,
  lui, continue de MESURER le dos sur la feuille déposée — juger et découper sont deux gestes.
- **Cloudprinter** : 
  le dos carré (24 à 60 p., le SEUL produit depuis le 15/09 ; l'agrafé est dans `archive/agrafe-2026-09/`)
  prend DEUX PDF `cover` + `book` — la couverture d'un dos carré ne peut physiquement pas vivre dans le
  même PDF que le bloc. Papier `pageblock_130mcg` (gloss : autre usine, port FR 6,46 € HT), `cp_ground`. Le md5 exigé est l'ETag R2 du PUT
  single-part. **Une référence de commande ne se RÉUTILISE JAMAIS**, même annulée : re-commande
  sous `<id>-r<epoch36>`. Sans `CLOUDPRINTER_API_KEY`, tout bascule en mode manuel sans casser.
- **Le webhook Stripe est PARTAGÉ** entre prévente et atelier. Le tri est EXPLICITE des deux côtés,
  **avant tout accès en base**, et aucun produit n'est le cas par défaut : `kind === 'atelier'` →
  atelier, `offer_type` ∈ founder|standard|influencer → prévente, ni l'un ni l'autre → orpheline
  journalisée et ignorée. Motif : un album de l'atelier payé en test a déclenché le mail
  « bienvenue en prévente ». ⚠️ `charge.refunded` n'a volontairement PAS de garde `offer_type` —
  les Charges de la prévente ne portent aucune métadonnée, et la garde bloquerait le remboursement
  des quatorze fondateurs sans rien protéger.

## Vérifier

`npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts` — sans base ni réseau, couvre
`transitions`, `urgence`, `mails` (`codesPour`, `doitAutoValider`, `manquePour`, `parametresPour`)
et `lot`. C'est le seul harnais de test du dépôt : **toute règle ajoutée ici s'y ajoute aussi.**
