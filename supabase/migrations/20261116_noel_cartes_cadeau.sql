-- NOËL 2026 : LES CARTES CADEAU ET LE CRÉDIT DU COMPTE (16/11/2026).
--
-- Décisions de Mathias du 16/11 (docs/noel-2026/DECISIONS-16-11.md) :
--   - une carte vaut 30 €, 50 € ou un montant libre de 20 à 200 € ;
--   - usage UNIQUE, valable douze mois ; ce qui reste après une commande va
--     sur le COMPTE de la personne qui l'utilise (pas sur le code) ;
--   - pas de fatura à l'achat de la carte (bon à usages multiples) : la
--     fatura se fait à la commande du magazine, carte déduite.
--
-- Trois tables, additives : aucune colonne existante n'est touchée.
--   cartes_cadeau       une carte vendue (son code, son montant, sa remise)
--   credits_mouvements  le grand livre du crédit d'un client, par adresse
--                       e-mail canonique : + reliquat d'une carte, - une
--                       commande payée avec. Le solde = la somme. Jamais de
--                       mise à jour, jamais de suppression : on ajoute.
--   cartes_mails        le verrou anti-doublon des mails d'une carte (GC1 à
--                       GC5), patron de `mails_envoyes`, qui ne connaît que
--                       les dossiers.
--
-- `livemode` est sur chaque ligne : la base de la prévisualisation EST celle
-- de la production, et un achat Stripe en mode test y écrit une vraie ligne.
-- Elle est marquée, jamais comptée comme une vente.
--
-- Appliquée sur accord explicite de Mathias (16/11). Vérification :
--   select table_name from information_schema.tables
--    where table_schema = 'public'
--      and table_name in ('cartes_cadeau', 'credits_mouvements', 'cartes_mails');
--   -- trois lignes attendues
--   select relname, relrowsecurity from pg_class
--    where relname in ('cartes_cadeau', 'credits_mouvements', 'cartes_mails');
--   -- relrowsecurity = true partout (RLS sans policy : seule la service key passe)

begin;

-- ------------------------------------------------------------ cartes_cadeau
create table if not exists public.cartes_cadeau (
  id                    uuid primary key default gen_random_uuid(),
  -- BJ-CADEAU-XXXXXX, alphabet sans 0/O/1/I/L ; ce que la personne tape.
  code                  text not null unique check (code ~ '^BJ-CADEAU-[A-HJKMNP-Z2-9]{6}$'),
  -- l'adresse de la page imprimable /carte/<token> : 32 caractères, jamais devinable.
  token                 text not null unique check (char_length(token) = 32),
  montant_centimes      integer not null check (montant_centimes between 2000 and 20000),
  acheteur_email        text not null,
  acheteur_prenom       text,
  destinataire_prenom   text not null,
  destinataire_email    text,
  message               text check (message is null or char_length(message) <= 140),
  -- `email` : la carte part par mail (GC2) ; `imprimer` : l'acheteur la remet lui-même.
  remise                text not null check (remise in ('email', 'imprimer')),
  -- jour d'envoi choisi (null = tout de suite) ; `envoyee_le` = quand GC2 est parti.
  envoi_le              date,
  envoyee_le            timestamptz,
  stripe_session_id     text not null unique,
  stripe_payment_intent text unique,
  livemode              boolean not null,
  statut                text not null default 'payee'
                          check (statut in ('payee', 'utilisee', 'remboursee', 'expiree')),
  expire_le             timestamptz not null,
  utilisee_le           timestamptz,
  utilisee_numero_id    uuid references public.numeros(id) on delete set null,
  rembourse_le          timestamptz,
  created_at            timestamptz not null default now(),
  check (remise = 'imprimer' or destinataire_email is not null)
);
create index if not exists cartes_cadeau_acheteur_idx on public.cartes_cadeau (lower(acheteur_email));
create index if not exists cartes_cadeau_a_envoyer_idx on public.cartes_cadeau (envoi_le)
  where envoyee_le is null and remise = 'email';
alter table public.cartes_cadeau enable row level security;

-- ------------------------------------------------------- credits_mouvements
create table if not exists public.credits_mouvements (
  id                uuid primary key default gen_random_uuid(),
  -- la clé du crédit : l'adresse canonique (même règle que waitlist.email_canonical).
  -- Le compte qui se connecte avec cette adresse, confirmée, voit le solde.
  email_canonical   text not null,
  montant_centimes  integer not null check (montant_centimes <> 0),
  motif             text not null
                      check (motif in ('reliquat_carte', 'paiement_numero', 'expiration', 'correction')),
  carte_id          uuid references public.cartes_cadeau(id) on delete restrict,
  numero_id         uuid references public.numeros(id) on delete set null,
  -- un reliquat garde la date de fin de sa carte.
  expire_le         timestamptz,
  livemode          boolean not null,
  note              text,
  created_at        timestamptz not null default now()
);
create index if not exists credits_mouvements_email_idx on public.credits_mouvements (email_canonical);
-- Idempotence du webhook : un seul reliquat par carte, un seul débit par commande.
create unique index if not exists credits_reliquat_unique on public.credits_mouvements (carte_id)
  where motif = 'reliquat_carte';
create unique index if not exists credits_paiement_unique on public.credits_mouvements (numero_id)
  where motif = 'paiement_numero';
alter table public.credits_mouvements enable row level security;

-- ------------------------------------------------------------- cartes_mails
create table if not exists public.cartes_mails (
  carte_id    uuid not null references public.cartes_cadeau(id) on delete cascade,
  code        text not null check (code in ('GC1', 'GC1b', 'GC2', 'GC2b', 'GC3', 'GC4', 'GC5')),
  envoye_le   timestamptz not null default now(),
  message_id  text,
  primary key (carte_id, code)
);
alter table public.cartes_mails enable row level security;

commit;
