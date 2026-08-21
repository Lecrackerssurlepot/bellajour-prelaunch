-- ════════════════════════════════════════════════════════════════════════
-- L'ATELIER — tunnel « un numéro par moment » (PRD-ATELIER §5 et §6).
--
-- À VALIDER ET ROULER PAR JOSEPH — ne pas appliquer en aveugle.
--
-- Trois tables NEUVES, strictement additives : aucune table existante n'est
-- altérée. waitlist, pages_credits, invoice_jobs et admin_last_seen sont
-- intouchées par cette migration.
--
-- ⚠️ PIÈGE DE NOMMAGE : la table `numeros` n'a AUCUN rapport avec la colonne
-- existante waitlist.numero_fondateur (place de fondateur en prévente).
-- Ce sont deux notions différentes qui portent le même mot.
--
-- RLS activé sans policy sur les trois tables : accès réservé au service role
-- (bypass RLS), comme toutes les autres tables du projet. Le token public de
-- /numero/[token] est résolu côté serveur, jamais par le navigateur.
-- ════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------- états
-- Machine à 8 états (+ 1b). Une transition n'est jamais réversible depuis
-- l'interface publique. Chaque changement écrit dans `evenements`.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'atelier_etat') then
    create type public.atelier_etat as enum (
      'photos_recues',           -- 1  · couverture sous 48 h
      'photos_insuffisantes',    -- 1b · action manuelle depuis /admin
      'apercu_pret',             -- 2  · la page qui vend
      'payee',                   -- 3
      'maquette_prete',          -- 4  · PDF + Canva en commentaire
      'validee',                 -- 5  · cliente, ou auto à J+7
      'en_production',           -- 6
      'expediee',                -- 7
      'livree'                   -- 8
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'atelier_palier') then
    create type public.atelier_palier as enum ('p30', 'p40', 'p45');
  end if;

  if not exists (select 1 from pg_type where typname = 'atelier_valide_par') then
    create type public.atelier_valide_par as enum ('cliente', 'auto');
  end if;
end$$;

-- ---------------------------------------------------------------- numeros
create table if not exists public.numeros (
  id                          uuid primary key default gen_random_uuid(),

  -- 32 caractères aléatoires. C'est l'URL publique ET la seule preuve
  -- d'identité : un seul lien, toute la vie du numéro, aucun compte.
  token                       text not null unique,
  etat                        public.atelier_etat not null default 'photos_recues',

  -- questionnaire (écrans 1 à 4)
  occasion                    text,
  histoire                    text,
  titre                       text,
  prenom                      text,
  email                       text,
  email_canonical             text,
  telephone                   text,

  -- dépôt (écran 5) et fabrication
  nb_photos                   integer not null default 0,
  nb_pages                    integer,
  palier                      public.atelier_palier,

  -- consentements. consent_photos est obligatoire au dépôt ; sans
  -- consent_communication, aucun extrait ne peut être publié (PRD §14).
  consent_photos              boolean not null default false,
  consent_communication       boolean not null default false,

  -- les deux cases de l'état 2, horodatées AVANT paiement (invariant nº3).
  -- Article L221-28 3° du code de la consommation : sans reconnaissance
  -- explicite préalable, la cliente garde 14 jours de rétractation.
  cgv_ok                      boolean not null default false,
  cgv_ok_at                   timestamptz,
  renonciation_retractation   boolean not null default false,
  renonciation_at             timestamptz,

  -- paiement (l'adresse est collectée par Stripe, jamais par nous)
  stripe_session_id           text,
  stripe_payment_intent       text,
  adresse_livraison           jsonb,

  -- livrables
  apercu_urls                 jsonb,
  maquette_pdf_url            text,
  canva_url                   text,

  valide_le                   timestamptz,
  valide_par                  public.atelier_valide_par,

  cloudprinter_order_id       text,
  tracking_url                text,
  transporteur                text,

  created_at                  timestamptz not null default now(),
  etat_maj_le                 timestamptz not null default now()
);

create unique index if not exists numeros_token_idx on public.numeros (token);
create index if not exists numeros_etat_idx on public.numeros (etat);
create index if not exists numeros_email_canonical_idx on public.numeros (email_canonical);
-- /admin trie par urgence : l'âge du dossier dans son état courant.
create index if not exists numeros_etat_maj_idx on public.numeros (etat_maj_le);

alter table public.numeros enable row level security;

-- ---------------------------------------------------------------- photos
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  numero_id   uuid not null references public.numeros(id) on delete cascade,
  r2_key      text not null,
  nom_origine text,
  taille      bigint,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists photos_numero_id_idx on public.photos (numero_id);
-- Une clé R2 ne peut appartenir qu'à une photo : redonner une URL signée à une
-- photo déjà arrivée écraserait l'objet référencé (piège nº8 du mémo d'upload).
create unique index if not exists photos_r2_key_idx on public.photos (r2_key);

alter table public.photos enable row level security;

-- ---------------------------------------------------------------- evenements
-- Journal append-only : chaque changement d'état, chaque mail parti, chaque
-- webhook. C'EST LE SEUL DÉBOGAGE POSSIBLE D'UN DOSSIER CLIENT (PRD §5).
-- Invariant nº6 : chaque transition d'état écrit ici.
create table if not exists public.evenements (
  id         uuid primary key default gen_random_uuid(),
  numero_id  uuid not null references public.numeros(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evenements_numero_id_idx on public.evenements (numero_id, created_at desc);

alter table public.evenements enable row level security;
