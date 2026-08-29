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

Les autres purs : `prix.ts` (grille 30/40/45 €, **serveur uniquement**), `questionnaire.ts` (les
6 champs exigés + `suggestionEmail`), `rebond.ts` (ce qu'un signal Brevo dit d'une adresse),
`parcours.ts` (les 8 jalons), `impression.ts` (table produit Cloudprinter),
`suivi.ts` (transporteur + code), `recit.ts`, `brief.ts`, `lot.ts`, `formats.ts`, `dates.ts`,
`token.ts` / `tokenForme.ts` (jumeau navigateur), `secret.ts`.
Les modules à effets : `mails.ts`, `r2.ts`, `cloudprinter.ts`, `paiement.ts`, `evenements.ts`,
`apercu.ts`. La règle de séparation est volontaire : **tout ce qui est testable sans réseau l'est**,
et `scripts/verif-atelier.ts` le prouve à chaque exécution.

## Les mails — trois garanties, dans cet ordre

`mails.ts → envoyerMailAtelier(supabase, code, numero)`, codes M0 → M9.
1. **Jamais un mail qui tombe sur une page vide** : `manquePour()` vérifie les données avant tout.
2. **Jamais deux fois** : l'insertion dans `mails_envoyes` (unique `numero_id`+`code`) EST le
   verrou, posée AVANT l'appel Brevo.
3. **Un échec Brevo retire le verrou** et journalise `mail_echec` ; la relève suivante réessaie.

⚠️ **Garde-fou de chaîne** : un mail ne part QUE si son prédécesseur est parti. Motivé par un cas
réel — un dossier « validée » sans aucun mail recevait « part à l'impression ». Seul M2 n'a pas de
prédécesseur ; il porte la seule borne de date, réglable par `ATELIER_M2_DEPUIS`.

⚠️ **La relève doit tourner tous les jours** (`vercel.json`, 7 h UTC). Sans elle, M2, M3b, M8 et
l'auto-validation à J+7 ne partent JAMAIS.

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
- **`suggestionEmail` corrige en Damerau, pas en Levenshtein.** L'inversion de deux lettres
  voisines est la faute la plus fréquente et Levenshtein la compte pour DEUX : à un caractère de
  plafond, le garde-fou ratait `gmial.com`, le cas nº1 qu'il visait. ⚠️ Plafond à UN caractère, et
  on SUGGÈRE sans jamais bloquer : à deux, on « corrige » `free.fr` en `live.fr`.

## Paiement et impression

- **Le prix est TOUJOURS calculé côté serveur** depuis `prix.ts`. Le navigateur n'envoie que le
  token. Pas de `price_id` Stripe : une seule source de vérité, pas de dérive test/prod.
- Zone `FR, BE, LU`. TVA : `automatic_tax` + prix TTC, 23 % (taux normal PT) — le câblage est
  inerte tant que l'immatriculation n'est pas posée chez Stripe, puis s'active sans redéploiement.
- **Cloudprinter** : les fichiers dépendent du produit. L'agrafé (20 p.) prend UN PDF `product` ;
  le dos carré (22-50 p.) prend DEUX PDF `cover` + `book` — la couverture d'un dos carré ne peut
  physiquement pas vivre dans le même PDF que le bloc. Le md5 exigé est l'ETag R2 du PUT
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
