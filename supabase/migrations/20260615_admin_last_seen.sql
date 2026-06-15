-- Admin dashboard interne — "nouveautés depuis la dernière visite" (global, partagé).
-- Table SINGLETON (une seule ligne, garantie par le check id = true) : stocke le
-- dernier timestamp où l'un de nous (Mathias / Louis) a chargé /admin.
--
-- Lue puis mise à jour à chaque chargement de /admin (server component, service key).
-- C'est la SEULE table où l'admin écrit — aucune donnée métier n'est jamais touchée.
-- RLS activé sans policy : accès réservé au service role (bypass RLS), comme les
-- autres tables du projet.

create table if not exists public.admin_last_seen (
  id           boolean primary key default true,
  last_seen_at timestamptz not null default now(),
  constraint admin_last_seen_singleton check (id = true)
);

insert into public.admin_last_seen (id) values (true)
  on conflict (id) do nothing;

alter table public.admin_last_seen enable row level security;
