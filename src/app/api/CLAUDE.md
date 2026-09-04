# API — effets de bord et surfaces exposées

34 routes. Beaucoup écrivent en base, envoient des mails, encaissent ou commandent une impression.
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
- **`/api/atelier/mails/relever`** — secret d'en-tête, comparé à durée constante (`memeSecret`) :
  `Authorization: Bearer <CRON_SECRET>` ou `x-atelier-secret`. 404 si le secret manque côté serveur.
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
| `/api/admin/atelier/transition` | patch d'état + R2 + **commande Cloudprinter réelle** + mails. `verifier: true` = dry-run, s'en servir |
| `/api/webhook` | mails F1/S1/P3/A3/relance, `assign_numero_fondateur`, crédits de parrainage |
| `/api/atelier/mails/relever` | **envois multiples** en un passage |
| `/api/atelier/numero` | crée le dossier + **M0 dans la seconde** |
| `/api/atelier/checkout`, `/api/checkout` | sessions Stripe + **coupon fondatrice frappé chez Stripe** et remise de 30 € appliquée d'office (T-021) |
| `/api/atelier/photos/supprimer` | DELETE R2 irréversible |
| `/api/brevo/webhook` | **rien qu'une ligne de journal** : aucun état, aucun mail |
| `/api/compte/inscription`, `/api/compte/mot-de-passe-oublie` | crée un compte `auth.users` et **envoie C1/C2 par Brevo** (lien frappé par `generateLink`, URL du site, jamais celle de Supabase) |

⚠️ **Un webhook ne doit jamais mentir sur son succès.** `logEvenement` est best-effort et ne
throw pas : ignorer sa valeur, c'est répondre 200 sur une écriture ratée, et Brevo comme
Cloudprinter ne réessaient que sur un code d'erreur — le signal est alors perdu DÉFINITIVEMENT.
Lire le résultat, rendre 500 sinon (T-038).

## Règles

- **Le prix vient du serveur, jamais du client.** Le front envoie `expected_offer` pour l'affichage
  seul et gère le 409 `offer_changed`. Ne jamais coder en dur un montant ni `FOUNDER_CAP` côté front.
- **La remise fondatrice aussi.** `/api/atelier/checkout` relit `waitlist` lui-même et pose
  `discounts` sur la session (T-021, 01/09). ⚠️ **`discounts` et `allow_promotion_codes` sont
  incompatibles chez Stripe** : les deux ensemble font échouer la création de session, donc
  empêchent de payer. La règle vit dans `@/lib/atelier/fondatrice`, avec le risque assumé (tunnel
  sans authentification) et ses quatre bornes. Ne jamais la réécrire dans une route.
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
  une protection.
- Supabase passe par la **service key, qui contourne RLS**, y compris sur les routes publiques.
  La sécurité repose entièrement sur le middleware et la validité du token.
