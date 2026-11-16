-- Noël 2026, lot 4 : la couverture du 2e exemplaire (règle de Noël, décision
-- de Mathias du 16/11 : −40 % même couverture, −20 % autre couverture, 2 au
-- plus, France seulement). Une ligne par dossier qui a fait un choix ; sans
-- ligne, « même couverture ». Table à part : `numeros` n'est pas touchée.
-- RLS activée sans policy : seule la clé de service lit et écrit.

create table if not exists public.noel_exemplaires (
  numero_id  uuid primary key references public.numeros(id) on delete cascade,
  couverture text not null check (couverture in ('meme', 'autre')),
  maj_le     timestamptz not null default now()
);

alter table public.noel_exemplaires enable row level security;
