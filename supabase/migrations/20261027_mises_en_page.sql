-- ════════════════════════════════════════════════════════════════════════
-- MISE EN PAGE, ÉTAPE 1 — LA SAUVEGARDE PARTAGÉE (`mises_en_page`)
--
-- ÉCRITE le 27/10/2026, NON APPLIQUÉE. Mathias l'applique lui-même
-- (docs/produit/MISE-EN-PAGE.md §8.2, tranché le 27/10).
--
-- Jusqu'ici un magazine en cours de mise en page vit dans le navigateur : bon
-- pour tester seul, pas pour que Louis reprenne sur son poste ce que Mathias a
-- commencé. Cette table est la SEULE cible d'écriture de tout l'outil de mise
-- en page (MISE-EN-PAGE.md §5) : aucune table existante n'est modifiée, aucune
-- colonne ajoutée ailleurs, aucun trigger.
--
-- Une ligne = un magazine en cours :
--   — `source` = particulier (un dossier `numeros`), edition (un magazine
--     d'une Édition collective) ou libre (photos locales, aucun rattachement) ;
--   — `contenu` = l'état `Magazine` de src/lib/mise-en-page/magazine.ts
--     (planches, gabarits, recadrages, textes), validé par `contenuValide`
--     (sauvegarde.ts) avant toute écriture, borné à 2 Mo par la route ;
--   — `version` = le verrou optimiste : chaque sauvegarde fait +1 et ne passe
--     que si elle part de la version en base (`issueSauvegarde`). La seconde
--     personne lit « Louis modifie ce magazine », et sa sauvegarde est refusée.
--   — `modifie_le` est posé par le CODE (le dépôt n'a aucun trigger
--     d'horodatage), le défaut ne sert qu'à la création.
-- Un seul enregistrement par dossier, un seul par magazine d'édition (index
-- uniques partiels) : un second POST rend 409 avec l'id existant, l'écran
-- l'ouvre au lieu d'en créer un double. Pas de suppression : archiver =
-- `etat = 'archive'`. Les cascades suivent la vie du dossier ou de l'édition.
--
-- ── LE REPLI CÔTÉ CODE ──────────────────────────────────────────────────
-- Table neuve, tout ou rien (begin/commit) : rien à replier colonne par
-- colonne. Sans elle, les routes /api/admin/atelier/mise-en-page/magazines
-- rendent un vrai 503 `migration_mises_en_page_absente` qui nomme ce fichier
-- (`tableAbsente` : PGRST205 / 42P01). L'éditeur garde sa copie locale : rien
-- ne se perd, rien n'est partagé.
-- ⚠️ La cohérence « le magazine appartient à l'édition » est tenue par la
-- route (une clé composite demanderait de toucher `collectif_magazines`).
--
-- ── VÉRIFIER QU'ELLE EST PASSÉE ─────────────────────────────────────────
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'mises_en_page'
--    order by ordinal_position;
--   -- attendu : 14 lignes (id … exporte_le)
--
--   select indexname from pg_indexes where schemaname = 'public' and tablename = 'mises_en_page';
--   -- attendu : la clé primaire, mises_en_page_numero_unique, mises_en_page_magazine_unique,
--   --           mises_en_page_edition_idx, mises_en_page_etat_modifie_idx
--
--   select conname from pg_constraint where conrelid = 'public.mises_en_page'::regclass and contype = 'c';
--   -- attendu : mises_en_page_coherence, mises_en_page_contenu_objet, mises_en_page_version_positive
--   --           (+ les check de source et etat, nommés par PostgreSQL)
--
--   select relrowsecurity from pg_class where oid = 'public.mises_en_page'::regclass;
--   -- attendu : true
--
-- ── PUIS QUE LA DONNÉE ARRIVE (pas seulement que l'écran s'affiche) ─────
--   -- après une sauvegarde réelle depuis l'outil (deux, de préférence) :
--   select id, source, titre, version, modifie_par, modifie_le, pg_column_size(contenu) as octets
--     from public.mises_en_page order by modifie_le desc limit 5;
--   -- attendu : la ligne, `version` qui monte à chaque sauvegarde, `modifie_par` = le prénom.
--   -- Toujours vide = la route rend 503 (cache PostgREST ? `notify pgrst, 'reload schema';`).
-- ════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.mises_en_page (
  id            uuid primary key default gen_random_uuid(),
  source        text not null check (source in ('particulier', 'edition', 'libre')),
  numero_id     uuid null references public.numeros(id) on delete cascade,
  edition_id    uuid null references public.collectif_editions(id) on delete cascade,
  magazine_id   uuid null references public.collectif_magazines(id) on delete cascade,
  titre         text not null,
  etat          text not null default 'en_cours' check (etat in ('en_cours', 'archive')),
  contenu       jsonb not null,
  version       integer not null default 1,
  cree_par      text,
  created_at    timestamptz default now(),
  modifie_par   text,
  modifie_le    timestamptz not null default now(),
  exporte_le    timestamptz null,

  -- particulier ⇒ numero_id seul ; edition ⇒ edition_id ET magazine_id ; libre ⇒ aucun rattachement
  constraint mises_en_page_coherence check (
       (source = 'particulier' and numero_id is not null and edition_id is null     and magazine_id is null)
    or (source = 'edition'     and numero_id is null     and edition_id is not null and magazine_id is not null)
    or (source = 'libre'       and numero_id is null     and edition_id is null     and magazine_id is null)
  ),
  constraint mises_en_page_contenu_objet check (jsonb_typeof(contenu) = 'object'),
  constraint mises_en_page_version_positive check (version >= 1)
);

-- Un seul enregistrement par dossier, un seul par magazine d'édition.
create unique index if not exists mises_en_page_numero_unique
  on public.mises_en_page (numero_id) where numero_id is not null;
create unique index if not exists mises_en_page_magazine_unique
  on public.mises_en_page (magazine_id) where magazine_id is not null;

-- L'accueil « En cours » / « Archivés », les plus récents d'abord.
create index if not exists mises_en_page_etat_modifie_idx
  on public.mises_en_page (etat, modifie_le desc);
-- La cascade depuis une édition supprimée (magazine_id a déjà son index unique).
create index if not exists mises_en_page_edition_idx
  on public.mises_en_page (edition_id) where edition_id is not null;

-- RLS sans policy : tout passe par la service key, côté serveur.
alter table public.mises_en_page enable row level security;
revoke all on public.mises_en_page from anon, authenticated;

comment on table public.mises_en_page is
  'Sauvegarde partagée de l''outil de mise en page interne (MISE-EN-PAGE.md §6) : seule table écrite par l''outil ; verrou optimiste par version (27/10/2026).';
comment on column public.mises_en_page.contenu is
  'L''état Magazine (src/lib/mise-en-page/magazine.ts), validé par contenuValide (sauvegarde.ts) avant écriture.';
comment on column public.mises_en_page.version is
  'Verrou optimiste : +1 à chaque sauvegarde, refusée (409) si la version envoyée n''est plus celle en base.';
comment on column public.mises_en_page.modifie_le is
  'Posé par le code à chaque sauvegarde (aucun trigger).';
comment on column public.mises_en_page.exporte_le is
  'Dernier export IDML ; null = jamais exporté.';

notify pgrst, 'reload schema';

commit;
