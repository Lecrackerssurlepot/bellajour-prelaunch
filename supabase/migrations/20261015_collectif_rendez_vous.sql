-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : les rendez-vous pris DANS l'espace client (D23, T-148).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Atomique (begin / commit) et idempotente : la rejouer ne change rien. Sans
-- elle, l'espace garde l'ancien bouton (le lien de rendez-vous de la fiche) et
-- la fiche atelier dit quelle migration manque.
--
-- Ce qui est rangé ici :
-- - les interlocuteurs de l'atelier (Mathias, Louis) : leur agenda Google et
--   leur lien visio, réglés dans /admin/collectif/agendas ;
-- - l'interlocuteur d'une édition (le responsable du projet côté atelier) ;
-- - les rendez-vous pris : un créneau, un statut, l'événement Google posé.
-- Le contenu des agendas n'est JAMAIS copié ici : seuls « libre / occupé »
-- sont lus, au moment d'afficher les créneaux.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── Les interlocuteurs de l'atelier ──
-- `agenda_id` : l'identifiant de l'agenda Google (pour un agenda principal,
-- l'adresse Gmail de la personne). `meet_url` : le lien visio fixe.
create table if not exists public.collectif_interlocuteurs (
  cle         text primary key check (cle ~ '^[a-z][a-z0-9-]{1,30}$'),
  prenom      text not null check (char_length(prenom) between 1 and 60),
  agenda_id   text check (agenda_id is null or char_length(agenda_id) between 3 and 200),
  meet_url    text check (meet_url is null or meet_url ~ '^https://'),
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.collectif_interlocuteurs (cle, prenom)
values ('mathias', 'Mathias'), ('louis', 'Louis')
on conflict (cle) do nothing;

-- ── L'interlocuteur d'une édition ──
-- null = pas encore choisi : l'espace garde le lien de rendez-vous de la fiche.
alter table public.collectif_editions
  add column if not exists interlocuteur_cle text
  references public.collectif_interlocuteurs(cle) on update cascade on delete set null;

-- ── Les rendez-vous ──
-- `sequence` : le numéro de version de l'invitation (.ics), +1 à chaque
-- déplacement ou annulation, pour que l'agenda du client remplace la version
-- précédente au lieu d'en ajouter une.
create table if not exists public.collectif_rendez_vous (
  id                 uuid primary key default gen_random_uuid(),
  edition_id         uuid not null references public.collectif_editions(id) on delete cascade,
  interlocuteur_cle  text not null references public.collectif_interlocuteurs(cle) on update cascade,
  debut              timestamptz not null,
  fin                timestamptz not null,
  motif              text check (motif is null or char_length(motif) <= 500),
  statut             text not null default 'pris' check (statut in ('pris', 'annule')),
  google_event_id    text,
  sequence           integer not null default 0 check (sequence >= 0),
  annule_le          timestamptz,
  created_at         timestamptz not null default now(),
  constraint collectif_rendez_vous_duree check (fin > debut)
);

-- Deux clients ne prennent jamais le même créneau du même interlocuteur :
-- la base le refuse, même si deux clics arrivent à la même seconde.
create unique index if not exists collectif_rendez_vous_creneau_unique
  on public.collectif_rendez_vous (interlocuteur_cle, debut)
  where statut = 'pris';

create index if not exists collectif_rendez_vous_edition_idx
  on public.collectif_rendez_vous (edition_id, debut);

-- Comme les treize tables de l'Édition collective : RLS activée, aucune
-- policy. Tout passe par la service key, côté serveur.
alter table public.collectif_interlocuteurs enable row level security;
alter table public.collectif_rendez_vous    enable row level security;

notify pgrst, 'reload schema';

commit;
