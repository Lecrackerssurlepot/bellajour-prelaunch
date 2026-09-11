# Base de données

10 tables réelles, RLS activée partout mais **contournée côté serveur par la service key**.
Chargé dès qu'on touche une migration ou le dossier supabase.

| Table | Rôle | Clé à connaître |
|---|---|---|
| `numeros` | le dossier d'une cliente, du questionnaire à la livraison | `token` unique = l'identité ; `etat` (9 valeurs) ; depuis 20260910 le prix GELÉ (`prix_centimes`, `livraison_centimes`, `livraison_niveau`, `pays_livraison`) ; `palier` est un bucket hérité, plus aucun prix n'en dépend, jamais de `drop` |
| `waitlist` | inscrits, clients de la prévente, ambassadeurs | `email` unique, `ref_code` unique, `numero_fondateur` unique |
| `photos` | une ligne par photo déposée | `r2_key` unique, `vignette_key` |
| `mails_envoyes` | **le verrou anti-doublon** | unique (`numero_id`, `code`) |
| `pages_credits` | crédits de parrainage | `source` unique |
| `evenements` | journal append-only du dossier | `type` + `payload` jsonb |
| `notes` | carnet de l'éditeur | `qui` ; `genre` nullable depuis le 08/09 (5 valeurs, validées en TS, PAS de `check` en base) |
| `dossiers_vus` | qui a vu quoi | PK composite |
| `admin_last_seen` | singleton | PK `id boolean check(id=true)` |
| `invoice_jobs` | facturation Fatura (edge function `emit-invoices`) | `stripe_payment_intent` unique |

RPC : `assign_numero_fondateur(p_email)`, appelée par `/api/webhook`.

**Le schéma `auth` est entré dans le produit le 04/09** (comptes clientes) : `auth.users` est
géré par Supabase Auth, jamais par une migration à nous. On n'y touche que par l'API admin
(`auth.admin.createUser`, `generateLink` — `@/lib/compte/session`). Deux points d'accroche dans
le schéma public : `numeros.compte_id` (FK vers `auth.users`, `on delete set null`) et le miroir
`waitlist.credit_consomme_le` / `credit_code`. ⚠️ **`compte_id` n'est PAS la seule façon de voir
ses dossiers** : le rapprochement par `email_canonical` opère aussi, à condition que l'email du
compte soit confirmé. La règle vit dans `@/lib/compte/rattachement`, pas dans une requête.

⚠️ Les tables `contacts`, `referrals`, `points_log`, `influencers` **n'ont jamais existé**.
Si une doc ou un prototype les cite, c'est une invention à corriger.

## La règle d'or des migrations

**Mathias applique les migrations lui-même. Personne d'autre ne les roule.**
Je n'applique JAMAIS une migration en production sans son accord explicite dans la conversation.

Conséquence directe, et c'est la plus importante de ce fichier :
**tout code qui lit ou écrit une colonne fraîche DOIT prévoir le repli sur l'erreur « colonne
inconnue »** — un second select, ou un insert/update sans la colonne. Sinon, pendant la
fenêtre entre le déploiement du code et l'application de la migration, la fonctionnalité tombe.
Ce repli existe déjà dans `donnees.ts`, le webhook Cloudprinter et la route de transition.
⚠️ **Le code d'erreur n'est pas le même en lecture et en écriture** (prouvé en prod le
03/09/2026) : un SELECT d'une colonne inconnue rend `42703`, mais un INSERT/UPDATE qui la
nomme rend **`PGRST204`** (« Could not find the column in the schema cache »). Un repli
d'écriture borné à `42703` ne se déclenche jamais — attraper LES DEUX.

⚠️ **Le repli a un revers, et il a déjà mordu** : il fait DISPARAÎTRE le champ du patch en silence.
Une colonne jamais migrée donne un code qui « marche » et une donnée qui n'est jamais enregistrée.
Après toute migration, vérifier que la donnée arrive vraiment — pas seulement que la page s'affiche.

## État connu

⚠️ **`20260911_atelier_finition.sql` (colonne `numeros.finition`, T-027) est À APPLIQUER.**
C'est la SEULE migration du dépôt dont le code d'écriture ne se replie pas, et c'est délibéré :
un repli ferait imprimer une couverture brillante à un client qui a cliqué « mate », en silence
et sur un objet fabriqué. La route rend un 500 franc qui nomme la migration dans les logs. La
LECTURE, elle, se replie partout (`/numero`, la route de livraison, la transition) : sans la
colonne, tout marche comme avant le 11/09 et les dossiers partent en brillant.
`20260910_atelier_prix_gele.sql` **est appliquée** (les quatre colonnes sont en base, vérifié le
11/09 ; `ETAT-PRODUCTION.md` a longtemps dit le contraire).

25 fichiers sur disque, 20 dans l'historique appliqué. **`20260908_notes_genre.sql` (colonne `notes.genre`, T-096) a été appliquée le 08/09/2026 sur accord explicite de Mathias**, et le revers a été CONTRÔLÉ, pas supposé : une note écrite par la vraie route porte bien `genre='page'` en base, l'écran l'étiquette, l'export la filtre. La note de vérification a été supprimée derrière. `20260901_atelier_retention.sql`
(colonne `numeros.anonymise_le`, T-076) a été **appliquée le 02/09/2026** (colonne présente, vérifiée).
Trois anciennes (`20260528_*`,
`20260704_notion_synced`) sont absentes de l'historique mais leurs colonnes existent : appliquées
hors CLI. Le détail à jour, avec ce qui manque, est dans `docs/reference/ETAT-PRODUCTION.md`.
