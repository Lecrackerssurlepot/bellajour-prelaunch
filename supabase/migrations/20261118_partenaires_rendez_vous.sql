-- ══════════════════════════════════════════════════════════════════════════
-- La page /partenaires et la connexion Google de chacun (18/11/2026)
--
-- ÉCRITE le 18/11/2026, PAS appliquée : à appliquer par Mathias (ou sur son
-- accord explicite), puis à vérifier en SQL.
--
-- 1. `collectif_interlocuteurs` : la connexion Google de la personne (OAuth).
--    `google_refresh` : son jeton de renouvellement, CHIFFRÉ par le serveur
--    (AES-256-GCM, agenda.ts) ; jamais en clair, jamais rendu à un navigateur.
--    `google_email` : le compte connecté, pour l'afficher dans l'atelier.
-- 2. `collectif_rdv_prospects` : les rendez-vous pris depuis /partenaires par
--    quelqu'un qui n'a pas encore d'édition. Aucune clé vers une édition.
--
-- Sans cette migration : l'espace client garde le compte de service (ou le
-- lien de rendez-vous de la fiche), /partenaires montre la brochure et
-- l'adresse de contact à la place des créneaux.
-- ══════════════════════════════════════════════════════════════════════════

begin;

alter table public.collectif_interlocuteurs
  add column if not exists google_refresh      text,
  add column if not exists google_email        text check (google_email is null or char_length(google_email) between 3 and 200),
  add column if not exists google_connecte_le  timestamptz;

create table if not exists public.collectif_rdv_prospects (
  id               uuid primary key default gen_random_uuid(),
  nom              text not null check (char_length(nom) between 2 and 80),
  organisation     text not null check (char_length(organisation) between 2 and 120),
  email            text not null check (char_length(email) between 3 and 200),
  telephone        text check (telephone is null or char_length(telephone) <= 30),
  message          text check (message is null or char_length(message) <= 500),
  debut            timestamptz not null,
  fin              timestamptz not null,
  statut           text not null default 'pris' check (statut in ('pris', 'annule')),
  -- Chez qui l'événement est posé (l'organisateur) ; les autres sont invités.
  organisateur_cle text references public.collectif_interlocuteurs(cle) on update cascade on delete set null,
  google_event_id  text,
  visio_url        text check (visio_url is null or visio_url ~ '^https://'),
  annule_le        timestamptz,
  created_at       timestamptz not null default now(),
  constraint collectif_rdv_prospects_duree check (fin > debut)
);

-- Deux prospects ne prennent jamais le même créneau : l'appel se fait à deux,
-- un créneau pris l'est pour tout l'atelier. La base le refuse, même si deux
-- clics arrivent à la même seconde.
create unique index if not exists collectif_rdv_prospects_creneau_unique
  on public.collectif_rdv_prospects (debut)
  where statut = 'pris';

create index if not exists collectif_rdv_prospects_email_idx
  on public.collectif_rdv_prospects (email, debut);

-- Comme toutes les tables de l'Édition collective : RLS activée, aucune
-- policy. Tout passe par la service key, côté serveur.
alter table public.collectif_rdv_prospects enable row level security;

notify pgrst, 'reload schema';

commit;
