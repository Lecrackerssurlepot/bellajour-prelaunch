# Base de données

12 tables réelles, RLS activée partout mais **contournée côté serveur par la service key**.
Chargé dès qu'on touche une migration ou le dossier supabase.

| Table | Rôle | Clé à connaître |
|---|---|---|
| `numeros` | le dossier d'une cliente, du questionnaire à la livraison | `token` unique = l'identité ; `etat` (9 valeurs) ; depuis 20260910 le prix GELÉ (`prix_centimes`, `livraison_centimes`, `livraison_niveau`, `pays_livraison`), depuis 20260916 le HT gelé `prix_ht_centimes` et `quantite` (1 à 10), depuis 20260911 `finition`, depuis 20260917 `origine` (chaud/froid, cockpit) ; `palier` est un bucket hérité, plus aucun prix n'en dépend, jamais de `drop` |
| `waitlist` | inscrits, clients de la prévente, ambassadeurs | `email` unique, `ref_code` unique, `numero_fondateur` unique |
| `photos` | une ligne par photo déposée | `r2_key` unique, `vignette_key` ; depuis 20260921 (T-123, **pas encore appliquée**) ce que la photo sait d'elle-même : `prise_le` (heure LOCALE sans fuseau, volontairement), `gps_lat/lon`, `appareil`, `largeur/hauteur`, `empreinte`, `luminance`, `lieu_ville/pays/code_pays`, et les deux marqueurs d'idempotence `metadonnees_le` / `lieu_le` |
| `mails_envoyes` | **le verrou anti-doublon** | unique (`numero_id`, `code`) |
| `pages_credits` | crédits de parrainage | `source` unique |
| `evenements` | journal append-only du dossier | `type` + `payload` jsonb |
| `notes` | carnet de l'éditeur | `qui` ; `genre` nullable depuis le 08/09 (5 valeurs, validées en TS, PAS de `check` en base) |
| `dossiers_vus` | qui a vu quoi | PK composite |
| `admin_last_seen` | singleton | PK `id boolean check(id=true)` |
| `invoice_jobs` | facturation Fatura (edge function `emit-invoices`) | `stripe_payment_intent` unique |
| `weekly_metrics` | l'agrégat hebdo du cockpit (migration 20260917, **appliquée le 17/09**) | `semaine` AAAASS PK, réécrite entière par le job du lundi : idempotent |
| `cockpit_settings` | les hypothèses du cockpit | singleton `id = true`, `regle_le` null = jamais réglé |

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

**`20260917_cockpit.sql` (`weekly_metrics`, `cockpit_settings`, `numeros.origine`) a été appliquée le 17/09/2026
via le MCP Supabase sur accord explicite de Mathias**, après vérification en SQL que son premier passage
à la main n'avait rien créé (les trois objets absents, les colonnes témoins présentes). Les trois objets et
la ligne de réglages sont vérifiés ; le job a tourné et lu la base (aucune semaine complète à écrire ce jour-là).

**`20260914_atelier_archive.sql` (colonne `numeros.archive_le`, T-113) a été appliquée le 14/09/2026 sur
accord explicite de Mathias** (colonne, index et cache PostgREST vérifiés). Le repli 42703 reste en
place partout (`lireNumeros`, `/numero`, `/compte`, la santé, la relève) : dormant, comme les autres.

**`20260911_atelier_finition.sql` (colonne `numeros.finition`) et
`20260916_atelier_exemplaires_prix_ht.sql` (`prix_ht_centimes`, `quantite`) ont été appliquées le
16/09/2026 par Mathias**, quelques minutes APRÈS la fusion de la PR #145 (colonnes vérifiées en base
ensuite). Ce sont les migrations du dépôt dont le code d'ÉCRITURE ne se replie pas, et c'est
délibéré : un repli ferait imprimer une couverture brillante à un client qui a cliqué « mate », ou
un seul exemplaire à qui en a payé trois, en silence et sur un objet fabriqué. La route rend un 500
franc qui nomme la migration dans les logs. La LECTURE, elle, se replie partout.
⚠️ Le repli d'écriture de la transition retire désormais UNE colonne à la fois (celle que PostgREST
nomme dans son message), pas toutes les colonnes fraîches d'un coup : prouvé le 16/09, l'ancien
retrait en bloc faisait perdre le prix gelé pour une seule colonne absente.
`20260910_atelier_prix_gele.sql` **est appliquée** (les quatre colonnes sont en base, vérifié le
11/09 et le 15/09).

26 fichiers sur disque, 23 dans l'historique appliqué. **`20260908_notes_genre.sql` (colonne `notes.genre`, T-096) a été appliquée le 08/09/2026 sur accord explicite de Mathias**, et le revers a été CONTRÔLÉ, pas supposé : une note écrite par la vraie route porte bien `genre='page'` en base, l'écran l'étiquette, l'export la filtre. La note de vérification a été supprimée derrière. `20260901_atelier_retention.sql`
(colonne `numeros.anonymise_le`, T-076) a été **appliquée le 02/09/2026** (colonne présente, vérifiée).
Trois anciennes (`20260528_*`,
`20260704_notion_synced`) sont absentes de l'historique mais leurs colonnes existent : appliquées
hors CLI. Le détail à jour, avec ce qui manque, est dans `docs/reference/ETAT-PRODUCTION.md`.
