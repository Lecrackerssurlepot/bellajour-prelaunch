-- ════════════════════════════════════════════════════════════════════════
-- MISE EN PAGE, LOT 2 — LA MÉMOIRE DE L'ÉDITEUR (`mep_lecons`, `mep_instantanes`)
--
-- ÉCRITE le 09/11/2026, NON APPLIQUÉE. Mathias l'applique lui-même.
--
-- Depuis la couche 1, la machine PROPOSE (floues, rafales et doublons en piles).
-- Chaque geste de l'atelier contraire à une proposition devient une LEÇON :
-- les photos, ce que la machine proposait, ce que l'atelier a fait, la règle,
-- les réglages en vigueur (`src/lib/mise-en-page/editeur/lecons.ts`, G1).
-- Les jalons (ouverture, export) y passent aussi : le temps par magazine (G6).
-- À l'export, l'INSTANTANÉ du magazine est figé (`mep_instantanes`, G2) : des
-- mesures (netteté, empreinte, dates, marques, doubles), JAMAIS les pixels.
-- Toute règle future est rejouée dessus avant d'être proposée (G5).
--
-- Rien ici ne change un réglage : les seuils vivent dans `reglages.ts`, et ne
-- bougent que sur un oui de Mathias, avec la preuve lue dans ces tables.
--
-- ── LE REPLI CÔTÉ CODE ──────────────────────────────────────────────────
-- Tables neuves, tout ou rien. Sans elles, POST rend 503
-- `migration_mep_lecons_absente` ; l'écran garde les leçons sur l'appareil
-- (au plus 500) et réessaie plus tard. Rien ne bloque l'atelier.
--
-- ── VÉRIFIER QU'ELLE EST PASSÉE ─────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'mep_lecons' order by ordinal_position;
--   -- attendu : id, mise_en_page_id, cle, type, regle, photos, proposition, geste, reglages, version, qui, quand, created_at
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'mep_instantanes' order by ordinal_position;
--   -- attendu : id, mise_en_page_id, cle, version, contenu, qui, created_at
-- ── PUIS QUE LA DONNÉE ARRIVE ───────────────────────────────────────────
--   select type, regle, count(*) from public.mep_lecons group by 1, 2 order by 3 desc;
--   -- `npx tsx --tsconfig tsconfig.json scripts/lecons.ts` fait le bilan lisible.
-- ════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.mep_lecons (
  id               uuid primary key default gen_random_uuid(),
  -- la sauvegarde partagée du magazine quand elle existe ; sinon `cle` suffit
  mise_en_page_id  uuid null references public.mises_en_page(id) on delete set null,
  -- la clé de l'écran (source + identifiant), toujours présente : un projet local n'a pas encore de ligne
  cle              text not null,
  type             text not null check (type in ('floue_gardee', 'pile_autre_gardee', 'pile_pas_un_doublon', 'tete_ecartee', 'pretri_renverse', 'reponse', 'ouverture', 'export')),
  regle            text not null,
  photos           jsonb not null default '[]'::jsonb,
  proposition      text not null default '',
  geste            text not null default '',
  reglages         jsonb not null,
  version          text not null,
  qui              text,
  -- l'heure du geste, posée par le navigateur (le serveur garde la sienne dans created_at)
  quand            timestamptz not null,
  created_at       timestamptz not null default now(),
  constraint mep_lecons_photos_tableau check (jsonb_typeof(photos) = 'array')
);

create index if not exists mep_lecons_cle_idx on public.mep_lecons (cle, quand);
create index if not exists mep_lecons_type_idx on public.mep_lecons (type, regle, version);

create table if not exists public.mep_instantanes (
  id               uuid primary key default gen_random_uuid(),
  mise_en_page_id  uuid null references public.mises_en_page(id) on delete set null,
  cle              text not null,
  version          text not null,
  -- forme `Instantane` (lecons.ts) : photos (mesures), lecture, tri, planches
  contenu          jsonb not null,
  qui              text,
  created_at       timestamptz not null default now()
);

create index if not exists mep_instantanes_cle_idx on public.mep_instantanes (cle, created_at desc);

-- RLS sans policy : tout passe par la service key, côté serveur.
alter table public.mep_lecons enable row level security;
alter table public.mep_instantanes enable row level security;
revoke all on public.mep_lecons from anon, authenticated;
revoke all on public.mep_instantanes from anon, authenticated;

comment on table public.mep_lecons is
  'Mémoire de l''éditeur de mise en page (lot 2, 09/11/2026) : un geste de l''atelier contraire à une proposition de la machine, et les jalons.';
comment on table public.mep_instantanes is
  'Instantané d''un magazine à l''export (lot 2, 09/11/2026) : mesures, lecture, marques, doubles. Jamais de pixels.';

notify pgrst, 'reload schema';

commit;
