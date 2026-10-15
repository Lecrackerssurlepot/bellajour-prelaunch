-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : le lien du responsable ne s'ouvre que sur un appareil
-- reconnu (T-154, décision de Mathias du 15/10 : « un code sur chaque appareil »).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Atomique (begin / commit) et idempotente (`if not exists`) : la rejouer ne
-- change rien. Sans elle, le contrôle ne s'applique pas (le code le dit au
-- journal) : il est de toute façon coupé tant que `COLLECTIF_CODE_APPAREIL`
-- et `COLLECTIF_MAILS` ne sont pas ouverts.
--
-- Aucun code, aucun identifiant d'appareil n'est stocké en clair : seulement
-- leur empreinte (sha256). RLS activée sans politique, comme les autres
-- tables : tout passe par la service key, côté serveur.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── Les codes envoyés ──
-- Un code par demande, lié à l'appareil qui l'a demandé : un code lu par
-- quelqu'un d'autre ne sert à rien sur un autre appareil. Il expire, compte
-- ses essais, et ne sert qu'une fois.
create table if not exists public.collectif_codes (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.collectif_editions(id) on delete cascade,
  appareil_empreinte text not null,
  code_empreinte text not null,
  essais integer not null default 0 check (essais >= 0),
  expire_le timestamptz not null,
  utilise_le timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists collectif_codes_edition_idx
  on public.collectif_codes (edition_id, created_at desc);
create index if not exists collectif_codes_appareil_idx
  on public.collectif_codes (edition_id, appareil_empreinte, created_at desc);
alter table public.collectif_codes enable row level security;

-- ── Les appareils reconnus ──
-- Un appareil reconnu POUR UN LIEN : `lien_empreinte` est l'empreinte du lien
-- du responsable au moment de la reconnaissance. Régénérer le lien dans
-- l'atelier rend donc tous les appareils inconnus, sans rien effacer.
create table if not exists public.collectif_appareils (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.collectif_editions(id) on delete cascade,
  appareil_empreinte text not null,
  lien_empreinte text not null,
  reconnu_le timestamptz not null default now(),
  vu_le timestamptz not null default now(),
  oublie_le timestamptz
);
create unique index if not exists collectif_appareils_unique_idx
  on public.collectif_appareils (edition_id, appareil_empreinte, lien_empreinte);
alter table public.collectif_appareils enable row level security;

notify pgrst, 'reload schema';

commit;
