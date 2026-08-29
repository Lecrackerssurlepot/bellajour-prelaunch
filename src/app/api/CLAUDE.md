# API — effets de bord et surfaces exposées

27 routes. Beaucoup écrivent en base, envoient des mails, encaissent ou commandent une impression.
Chargé dès qu'on touche une route.

## Qui est protégé par quoi

- **`/api/admin/*`** — `middleware.ts` (cookie HMAC `bj_admin`) ET re-vérification dans chaque
  route via `quiEstConnecteRequete`. Défense en profondeur volontaire : le matcher du middleware
  ne couvre que `/admin` et `/api/admin`, donc **une route d'écriture posée ailleurs serait
  ouverte au premier venu**. Toute nouvelle route qui écrit va sous `/api/admin/`.
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

## Les effets de bord, par ordre de gravité

| Route | ce qu'elle déclenche vraiment |
|---|---|
| `/api/admin/atelier/transition` | patch d'état + R2 + **commande Cloudprinter réelle** + mails. `verifier: true` = dry-run, s'en servir |
| `/api/webhook` | mails F1/S1/P3/A3/relance, `assign_numero_fondateur`, crédits de parrainage |
| `/api/atelier/mails/relever` | **envois multiples** en un passage |
| `/api/atelier/numero` | crée le dossier + **M0 dans la seconde** |
| `/api/atelier/checkout`, `/api/checkout` | sessions Stripe |
| `/api/atelier/photos/supprimer` | DELETE R2 irréversible |
| `/api/brevo/webhook` | **rien qu'une ligne de journal** : aucun état, aucun mail |

## Règles

- **Le prix vient du serveur, jamais du client.** Le front envoie `expected_offer` pour l'affichage
  seul et gère le 409 `offer_changed`. Ne jamais coder en dur un montant ni `FOUNDER_CAP` côté front.
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
