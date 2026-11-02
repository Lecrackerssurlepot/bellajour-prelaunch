-- ════════════════════════════════════════════════════════════════════════
-- MISE EN PAGE, LOT 4 — LES GABARITS ENREGISTRÉS PAR L'ATELIER (`mep_gabarits`)
--
-- ÉCRITE le 03/11/2026, NON APPLIQUÉE. Mathias l'applique lui-même.
--
-- Une page retouchée à la main dans l'éditeur (cadres déplacés, agrandis, posés
-- en libre, calques) peut devenir un gabarit : « Enregistrer comme gabarit »,
-- dans le menu de la pastille de la page. Il est proposé ensuite à tous les
-- projets, en tête du tiroir et de R, pour le même nombre de photos.
--
-- Une ligne = un gabarit :
--   — `portee` = page (repère de la page DROITE, la gauche est son miroir) ou
--     double (repère de la planche 420 × 297), comme les gabarits du code ;
--   — `cadres` = les cadres en mm (forme `Cadre` de src/lib/mise-en-page/types.ts),
--     relus par `cadreValide` (sauvegarde.ts) avant toute écriture ;
--   — `nb_photos`, `signature` = calculés par la route, jamais crus du navigateur ;
--   — pas de suppression : `etat = 'archive'` le retire des propositions.
-- Un magazine qui a utilisé un gabarit en garde une COPIE de ses cadres
-- (`Disposition.cadres`) : archiver ou perdre la table ne casse aucune page.
--
-- ── LE REPLI CÔTÉ CODE ──────────────────────────────────────────────────
-- Table neuve, tout ou rien. Sans elle, GET rend une liste vide (l'éditeur
-- marche sans gabarits enregistrés) et POST rend 503
-- `migration_mep_gabarits_absente`, que l'écran dit en clair.
--
-- ── VÉRIFIER QU'ELLE EST PASSÉE ─────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'mep_gabarits' order by ordinal_position;
--   -- attendu : id, nom, portee, nb_photos, signature, cadres, decor, etat, cree_par, created_at
--   select relrowsecurity from pg_class where oid = 'public.mep_gabarits'::regclass;
--   -- attendu : true
-- ── PUIS QUE LA DONNÉE ARRIVE ───────────────────────────────────────────
--   -- après un « Enregistrer comme gabarit » dans l'éditeur :
--   select id, nom, portee, nb_photos, signature, cree_par, created_at from public.mep_gabarits order by created_at desc limit 5;
-- ════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.mep_gabarits (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  portee      text not null check (portee in ('page', 'double')),
  nb_photos   integer not null check (nb_photos between 1 and 12),
  signature   text not null,
  cadres      jsonb not null,
  decor       jsonb null,
  etat        text not null default 'actif' check (etat in ('actif', 'archive')),
  cree_par    text,
  created_at  timestamptz not null default now(),
  constraint mep_gabarits_cadres_tableau check (jsonb_typeof(cadres) = 'array')
);

create index if not exists mep_gabarits_etat_idx on public.mep_gabarits (etat, created_at desc);

-- RLS sans policy : tout passe par la service key, côté serveur.
alter table public.mep_gabarits enable row level security;
revoke all on public.mep_gabarits from anon, authenticated;

comment on table public.mep_gabarits is
  'Gabarits enregistrés depuis l''éditeur de mise en page (lot 4, 03/11/2026) ; pas de suppression, etat = archive.';

notify pgrst, 'reload schema';

commit;
