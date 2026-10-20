# API — effets de bord et surfaces exposées

38 routes. Beaucoup écrivent en base, envoient des mails, encaissent ou commandent une impression.
Chargé dès qu'on touche une route.

## Qui est protégé par quoi

- **`/api/admin/*`** — `middleware.ts` (cookie HMAC `bj_admin`) ET re-vérification dans chaque
  route via `quiEstConnecteRequete`. Défense en profondeur volontaire : le matcher du middleware
  ne couvre que `/admin` et `/api/admin`, donc **une route d'écriture posée ailleurs serait
  ouverte au premier venu**. Toute nouvelle route qui écrit va sous `/api/admin/`.
- **`/api/admin/login`** — hors middleware (sinon on ne se connecte jamais) ; comparaison à durée
  constante + frein `@/lib/frein-login` (délai croissant par échec, 429 au seuil, `console.warn`
  dès la 3e récidive). La règle du frein vit dans le module pur ET dans `verif-atelier.ts`.
- **`/api/waitlist`** — réponse **indistinguable** qu'un email soit en base ou non (T-045) :
  même statut, même corps, durée rapprochée par `delaiNeutre`. Ne jamais y remettre
  `already_registered`, `ref_code` ou `prenom` — un « déjà inscrite » se dit par MAIL.
- **`/api/atelier/*`** — pas d'authentification : **le token de 32 caractères EST l'identité**.
  C'est la seule barrière. Ne jamais exposer un token dans une URL partageable, un log ou un mail
  autre que celui de sa cliente.
- **`GET /api/atelier/numero?token=`** rend aussi `titre`, `prenom` (ceux que `/numero/<token>`
  montre déjà au porteur du token) et `atelier: true` quand la requête porte un cookie `bj_admin`
  VALIDE (T-156). Ce drapeau n'ouvre rien : il dit au navigateur ce que vaut son propre cookie
  httpOnly, pour que l'écran 5 prévienne au lieu de reprendre en silence. `Cache-Control: private,
  no-store`, la réponse dépend du cookie.
- **`/api/atelier/mails/relever`** — secret d'en-tête, comparé à durée constante (`memeSecret`) :
  `Authorization: Bearer <CRON_SECRET>` ou `x-atelier-secret`. 404 si le secret manque côté serveur.
- **`/api/atelier/cockpit/agreger`** — le job du lundi du cockpit (cron Vercel), mêmes deux secrets
  d'en-tête que la relève, fermée sans secret. N'écrit que `weekly_metrics` : ni mail, ni état.
- **`/api/webhook`** (Stripe) — signature `constructEvent` + `STRIPE_WEBHOOK_SECRET`.
- **`/api/cloudprinter/webhook`** — `CLOUDPRINTER_WEBHOOK_KEY`, HORS middleware, **fermée par
  défaut si la clé manque** (refus, pas ouverture).
- **`/api/brevo/webhook`** — `BREVO_WEBHOOK_SECRET`, HORS middleware, fermée par défaut. Brevo ne
  signe pas ses webhooks mais accepte des **en-têtes personnalisés** : le secret reste dans un
  en-tête (`x-bellajour-secret` ou Bearer), jamais dans l'URL.
- **`/api/compte/*`** — session Supabase Auth lue par `utilisateurConnecte()`
  (`@/lib/compte/session`), **jamais par le middleware** : sa branche `/compte` ne fait que
  RAFRAÎCHIR les jetons, elle ne garde rien. Chaque route porte donc sa propre garde, et
  `/compte` (la page) redirige elle-même vers la connexion. Trois règles qui ne se négocient pas :
  **(1)** inscription, connexion et mot de passe oublié répondent de façon **indistincte**
  (patron `/api/waitlist`, `delaiNeutre` de `@/lib/compte/garde`) — une inscription qui dit
  « ce compte existe » est un annuaire des clientes ; **(2)** la réinitialisation appelle
  `signOut()` **dans tous les cas** : un lien de mail n'ouvre jamais de session durable ;
  **(3)** le compte n'a AUCUN pouvoir sur les routes `/api/atelier/*` — le token y reste
  l'unique identité, avec ou sans compte.

## Les effets de bord, par ordre de gravité

| Route | ce qu'elle déclenche vraiment |
|---|---|
| `/api/admin/atelier/transition` | patch d'état + R2 + **commande Cloudprinter réelle** + mails. `verifier: true` = dry-run, s'en servir ; depuis le 18/09 (T-121) `envoyer_impression` RELIT les deux PDF du coffre (jusqu'à 130 Mo chacun, `maxDuration` 300) et refuse un format hors specs, dry-run compris ; depuis le 10/09 le dry-run de `publier_apercu` / `corriger_apercu` demande **un devis Cloudprinter** (`prices/lookup`, rationné : un seul par vérification) et gèle prix, livraison, niveau d'expédition et pays ; depuis le 22/09 (T-126, T-127) `publier_maquette` suit le lien court Canva et lit la page publique du design (deux requêtes chez Canva, sans clé) : titre rendu au dry-run et au journal (`canva_titre`), 422 sous `canva_url` si le lien donne l'édition, la lecture seule ou rien, passage « non vérifié » si Canva ne répond pas |
| `/api/admin/atelier/souvenir` | relit les DEUX PDF du coffre (jusqu'à 130 Mo chacun, `maxDuration` 300), écrit un nouvel objet R2, remplace `souvenir_pdf_key` et **supprime l'ancien objet**. Deux appelants navigateur (le panneau après `envoyer_impression`, le bouton de la carte Impression). Depuis le 21/09 (T-122) **un seul passage à la fois** : verrou dans le journal (`souvenir_demarre` → `souvenir_genere` / `souvenir_echoue`, règle pure `etatGenerationSouvenir`), 409 `deja_en_cours` sinon ; la fiche relit le même journal pour éteindre le bouton |
| `/api/admin/atelier/relance` | **un mail réel** à un client, sans changer d'état. N'accepte aucun motif en entrée : la règle (`evaluerRelance`) est relue côté serveur au clic |
| `/api/webhook` | mails F1/S1/P3/A3/relance, `assign_numero_fondateur`, crédits de parrainage |
| `/api/atelier/mails/relever` | **envois multiples** en un passage ; depuis le 20/10 (T-194), APRÈS sa réponse (`after()`), le rattrapage quotidien des photos d'édition arrivées au coffre sans confirmation (confirme, fabrique les vignettes manquantes, journalise ; aucun mail) ; et (lot w1, migration 20261023) **la purge de la corbeille des éditions : DELETE de lignes puis DELETE R2 irréversible** des photos à la corbeille depuis 30 jours (`purgeQuotidienne`, 500 au plus, silencieuse sans la migration) ; depuis l'audit du 20/10 la LIGNE part d'abord (re-contrôlée), le coffre ensuite, et un objet qui résiste est retenté aux passages suivants (`reprendreObjets`, journal `objets_a_effacer` / `objets_effaces`) ; et (T-159, 20/10 au soir) **la fin de conservation des éditions livrées depuis 30 jours : suppression des personnes, métadonnées des photos vidées, puis DELETE R2 irréversible** (`retentionQuotidienne`, deux éditions au plus, l'ordre S7, reprise de ce qui résiste), ⚠️ **COUPÉE tant que `COLLECTIF_RETENTION_AUTO` n'est pas posé** (elle ne lit même pas la base) |
| `/api/admin/collectif/editions/[id]/corbeille` (`effacer`) | **DELETE de lignes puis DELETE R2 irréversible** (« Effacer maintenant », l'atelier seul, `verifier: true` d'abord ; 200 avec `ratees`, plus de 502) ; `supprimer` / `restaurer` ne touchent que la base |
| `/api/collectif/depot/supprimer`, `/api/collectif/photos/corbeille` | mettent à la corbeille (restaurable 30 jours), rien au coffre ; le participant seulement pour les photos de SON téléphone |
| `/api/collectif/photos`, `/api/collectif/depot/album`, `/api/admin/collectif/editions/[id]/lot` | sur une édition effacée (`photos_supprimees_le`, T-159) : **410 `photos_effacees`** avec la phrase, rien de signé (les objets sont partis) |
| `/api/atelier/numero` | crée le dossier + **M0 programmé chez Brevo pour +15 min** (T-116) ; le PATCH de consentement annule ce M0 puis envoie M1 |
| `/api/atelier/photos/complete` | confirme les photos ; **au premier lot confirmé, annule le M0 programmé** (T-116, `annulerMailProgramme`) ; depuis le 21/09 (T-123) lit en tâche de fond (`after()`, après la réponse) la date, le GPS, l'appareil, les dimensions et l'empreinte des photos confirmées (`enrichirDossier`, best-effort strict, `maxDuration` 60) |
| `/api/atelier/numero` (PATCH `consent_photos`) | en `after()` : ce qui manque encore, puis **les LIEUX** par Geoapify, un appel par lieu (T-123) |
| `/api/admin/atelier/metadonnees` | le bouton « Lire les photos » : même passage, synchrone, `maxDuration` 300 ; 503 `colonne_absente` sans la migration 20260921 ; une ligne de journal `metadonnees_lues` si quelque chose a été lu, aucun mail, aucun état |
| `/api/atelier/checkout`, `/api/checkout` | sessions Stripe + **coupon fondatrice frappé chez Stripe** et remise de 30 € appliquée d'office (T-021) ; depuis le 10/09 le montant vient du prix GELÉ (`prix_centimes`) ; depuis le 16/09 une ligne Stripe par rang d'exemplaire (`decompteExemplaires`), la livraison est une `shipping_option` au port de zone ou au devis gelé, à 0 dès 50 € de magazines ou pour un fondateur, `allowed_countries = [pays déclaré]`, le pays est EXIGÉ ; zone C sans devis → 409 `livraison_indisponible`, jamais un montant de repli ; depuis le 19/09 un fondateur reconnu dont le crédit ne peut pas être posé → 409 `credit_indisponible` + journal, jamais un plein tarif |
| `/api/atelier/photos/supprimer` | DELETE R2 irréversible |
| `/api/brevo/webhook` | **rien qu'une ligne de journal** : aucun état, aucun mail |
| `/api/admin/cockpit/*`, `/api/admin/atelier/origine` | réglages du cockpit, recalcul de l'agrégat, origine chaud/froid d'un dossier : aucun mail, aucun état, une ligne de journal pour l'origine |
| `/api/compte/inscription`, `/api/compte/mot-de-passe-oublie` | crée un compte `auth.users` et **envoie C1/C2 par Brevo** (lien frappé par `generateLink`, URL du site, jamais celle de Supabase) |

⚠️ **Un webhook ne doit jamais mentir sur son succès.** `logEvenement` est best-effort et ne
throw pas : ignorer sa valeur, c'est répondre 200 sur une écriture ratée, et Brevo comme
Cloudprinter ne réessaient que sur un code d'erreur — le signal est alors perdu DÉFINITIVEMENT.
Lire le résultat, rendre 500 sinon (T-038).

## Règles

- **Jamais `TABLE[saisie]` sur un objet littéral quand la clé vient du client** (cookie, corps,
  paramètre d'URL). `{}` répond aussi à `constructor`, `__proto__`, `toString`… : des valeurs non
  vides et publiques. C'est ainsi qu'un faux cookie au nom de `constructor` ouvrait tout
  l'atelier sans mot de passe jusqu'au 19/10/2026 (T-161). Lire par `Object.hasOwn(table, cle)`,
  un objet `Object.create(null)` ou une `Map`, et vérifier le type de la valeur trouvée.
  Les comptes de l'atelier ne se lisent QUE par `motDePasseDe()` (`@/lib/admin-auth`).
- **Le prix vient du serveur, jamais du client.** Le front envoie `expected_offer` pour l'affichage
  seul et gère le 409 `offer_changed`. Ne jamais coder en dur un montant ni `FOUNDER_CAP` côté front.
- **La remise fondatrice aussi.** `/api/atelier/checkout` relit `waitlist` lui-même et pose
  `discounts` sur la session (T-021, 01/09). ⚠️ **`discounts` et `allow_promotion_codes` sont
  incompatibles chez Stripe** : les deux ensemble font échouer la création de session, donc
  empêchent de payer. La règle vit dans `@/lib/atelier/fondatrice`, avec le risque assumé (tunnel
  sans authentification) et ses quatre bornes. Ne jamais la réécrire dans une route.
- **L'interrupteur des envois** (`ATELIER_MAILS_COUPES`, T-108) coupe l'appel à Brevo dans
  `sendBrevoEmail` ET dans les trois envois propres de `/api/waitlist` : les deux chemins, sinon
  il mentirait sur la moitié des mails. Il rend `false` comme un échec, donc le verrou de
  `mails_envoyes` se retire et rien ne se croit envoyé. Posé à la main en local, jamais sur
  Vercel, et JAMAIS couplé à `NODE_ENV` (règle écrite dans `src/lib/envois.ts`).
- **Un envoi de mail ne doit jamais faire échouer une action métier.** `sendBrevoEmail` est
  best-effort strict : elle ne throw jamais. Corollaire : **un mail non parti ne remonte nulle
  part sauf dans les logs Vercel.**
- **« Accepté par Brevo » n'est pas « arrivé ».** C'est tout ce que rend `sendBrevoEmail`, et
  c'est ce que le verrou de `mails_envoyes` enregistre sous le nom « envoyé ». Le verdict réel
  arrive plus tard, par `/api/brevo/webhook`. Un rebond n'y déclenche **aucune décision** —
  ni état, ni mail : appeler, corriger l'adresse ou ne rien faire dépend du dossier, et une
  machine qui trancherait se tromperait en silence.
- **Toute écriture est journalisée** dans `evenements` (append-only). C'est le récit du dossier ;
  l'admin le relit via `recit.ts`.
- Validation d'entrée à la main (`isValidNumeroToken`, `isValidRefCode`, `canonicalizeEmail`) :
  pas de zod. Les corps de POST sont typés `unknown` puis inspectés. Suivre ce style.
- **Le rate-limit est une `Map` en mémoire de processus** : sur Vercel il n'est PAS partagé entre
  instances. Il freine un script naïf, il n'arrête pas une attaque. Ne pas le présenter comme
  une protection. `creerPlafond` compte par l'en-tête `x-forwarded-for` brut ; une route publique
  que toute une classe ouvre en même temps (le dépôt des éditions) compte par `creerFrein` avec une
  clé « adresse du client + lien » (`ipDuClient`, `freins.ts`) et un second frein large par
  `ipDeConnexion` : `cf-connecting-ip` se forge en visant *.vercel.app directement.
- **Un texte venu d'un client n'entre jamais dans `.in()`** de supabase-js : il n'est pas échappé
  (`Zed","Léa Martin` part en deux valeurs). `listeIn` (`collectif/lignes.ts`) par
  `.filter(colonne, "in", …)`.
- **Un lien qui part par mail prend l'origine du SITE** (`NEXT_PUBLIC_SITE_URL`), jamais un
  en-tête de la requête : `host` et surtout `x-forwarded-host` s'écrivent par l'appelant, et une
  route publique enverrait un vrai mail de Bellajour qui mène chez lui. Côté particuliers, c'est
  `SITE_URL` (T-049) ; côté éditions, `origineDesMails` (T-164). Le harnais refuse
  `origineDepuis` et `x-forwarded-host` dans toute route.
- Supabase passe par la **service key, qui contourne RLS**, y compris sur les routes publiques.
  La sécurité repose entièrement sur le middleware et la validité du token.
