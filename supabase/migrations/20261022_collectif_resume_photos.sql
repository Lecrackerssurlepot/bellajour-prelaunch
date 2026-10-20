-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : les photos se COMPTENT en base, les doublons se
-- RANGENT (T-168 et T-170, 20/10/2026).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Avant elle, la grille des photos (`/api/collectif/photos`) et le tableau de
-- bord relisaient TOUTES les photos de l'édition à chaque affichage (5 000
-- lignes pour 5 000 photos, par tranches de 1 000), et la grille recalculait
-- les doublons à chaque page. Trois objets, rien d'autre :
--
-- 1. `collectif_photos_resume` : une VUE, une ligne par façon d'avoir déposé
--    (qui, par quel lien, sous quel type, sous quel nom, et pour un
--    participant depuis quel téléphone), avec le nombre de photos, celles de
--    « Ma sélection », celles qu'on peut encore choisir, la première et la
--    dernière arrivée, la dernière vignette. À peu près une ligne par personne
--    et par dossier : quelques centaines pour une édition de 5 000 photos.
--    L'arbre des dossiers, les personnes, les comptes et les couvertures se
--    calculent dessus (`resumePhotos.ts`), et la grille ne lit plus que la
--    PAGE affichée. `security_invoker` : la vue lit
--    la table avec les droits de qui l'interroge (la clé de service), jamais
--    avec ceux de son propriétaire ; et ni `anon` ni `authenticated` ne la
--    lisent.
-- 2. `collectif_doublons` : le résultat du repérage des doublons, UNE ligne
--    par édition, calculé après la lecture des empreintes d'un lot
--    (`doublonsStockes.ts`), relu par la grille, le tableau de bord et la
--    fiche. `signature` dit sur quoi il a porté : périmé, il se recalcule au
--    premier affichage. Un cache, rien qui ne se retrouve : le vider ne perd
--    rien.
-- 3. un index (édition, arrivée, id) : l'ordre de la grille et de ses pages.
--
-- Aucune colonne de `collectif_photos` ne bouge, aucune donnée n'est écrite.
-- Atomique (begin / commit) et rejouable (`if not exists`, `or replace`).
-- Sans elle, le code tourne déjà : la grille et le tableau de bord relisent
-- tout comme avant (repli sur `PGRST205` / `42P01`), et les doublons se
-- calculent à l'affichage, sans être rangés.
-- Exige PostgreSQL 15 (`security_invoker`) : c'est la version des projets
-- Supabase depuis 2023.
--
-- Vérifier après l'avoir appliquée (lecture seule) :
--   select table_name, table_type from information_schema.tables
--    where table_name in ('collectif_photos_resume', 'collectif_doublons');
--   select n, sum(n) over () from public.collectif_photos_resume
--    where edition_id = '<une édition>' limit 5;
-- (la somme des `n` = le nombre de photos arrivées de l'édition), puis, après
-- un premier lot de photos lu :
--   select edition_id, signature, photos, complet, calcule_le,
--          jsonb_array_length(groupes) from public.collectif_doublons;
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Le résumé des photos arrivées ──
-- `id` : la clé du regroupement (sa forme `row(...)::text` distingue un nom
-- vide d'un nom absent), qui donne un ORDRE STABLE à la lecture par tranches.
-- Le téléphone ne sert qu'à compter les participants « Sans nom »
-- (`compterPersonnes`, qui ignore le responsable et l'atelier) : il n'est
-- gardé que pour une photo de participant (rôle participant, ou arrivée par un
-- ⚠️ 20/10 : la colonne calculée s'appelle `appareil_cle`, jamais `appareil` : `collectif_photos`
-- a DÉJÀ une colonne `appareil` (le modèle du téléphone lu dans la photo), et `c.*` plus un
-- `appareil` calculé rendaient « column reference "appareil" is ambiguous » (42702) à la
-- première application. La transaction avait tout annulé : rien n'était appliqué.
-- lien, `deParticipant`), sinon un responsable qui dépose depuis deux appareils
-- doublerait ses lignes pour rien.
create or replace view public.collectif_photos_resume
  with (security_invoker = true) as
select
  p.edition_id,
  md5(row(p.role_deposant, p.provenance_id, p.provenance_type, p.deposant, p.appareil_cle)::text) as id,
  p.role_deposant,
  p.provenance_id,
  p.provenance_type,
  p.deposant,
  p.appareil_cle as appareil_id,
  count(*)::integer as n,
  (count(*) filter (where p.preselection))::integer as n_selection,
  (count(*) filter (where not p.signalee and not p.preselection))::integer as n_choisissables,
  -- la première arrivée (et son id) : l'ordre dans lequel la lecture d'avant voyait les
  -- façons de déposer, qui départage deux orthographes d'un nom aussi fréquentes l'une que l'autre
  min(p.confirmee_le) as premiere,
  (array_agg(p.id order by p.confirmee_le, p.id))[1] as premiere_photo,
  max(p.confirmee_le) as derniere,
  max(p.confirmee_le) filter (where p.vignette_key is not null) as vignette_le,
  (array_agg(p.id order by p.confirmee_le desc, p.id desc) filter (where p.vignette_key is not null))[1] as vignette_photo,
  (array_agg(p.vignette_key order by p.confirmee_le desc, p.id desc) filter (where p.vignette_key is not null))[1] as vignette_key
from (
  select c.*,
         case when c.role_deposant = 'participant' or c.provenance_id is not null then c.appareil_id end as appareil_cle
    from public.collectif_photos c
   where c.confirmee_le is not null
) p
group by p.edition_id, p.role_deposant, p.provenance_id, p.provenance_type, p.deposant, p.appareil_cle;

comment on view public.collectif_photos_resume is
  'Une ligne par façon d''avoir déposé (T-168) : l''arbre, les personnes, les comptes et les couvertures de la grille et du tableau de bord. Lue par la clé de service seulement.';

revoke all on public.collectif_photos_resume from anon, authenticated;

-- ── 2. Les doublons rangés ──
create table if not exists public.collectif_doublons (
  edition_id uuid primary key references public.collectif_editions(id) on delete cascade,
  -- [{ "originale": uuid, "doublons": [uuid, …] }, …] (doublons.ts)
  groupes    jsonb not null,
  -- « <photos arrivées avec une empreinte>|<dernier metadonnees_le> » (signatureDoublons)
  signature  text not null,
  -- les photos arrivées lues pour ce calcul
  photos     integer not null check (photos >= 0),
  -- false : le budget de comparaisons a été dépassé, aucun groupe rendu
  complet    boolean not null,
  calcule_le timestamptz not null default now()
);
alter table public.collectif_doublons enable row level security;
revoke all on public.collectif_doublons from anon, authenticated;

comment on table public.collectif_doublons is
  'Le repérage des doublons d''une édition (T-170), recalculé quand sa signature change. Un cache : le vider ne perd rien.';

-- ── 3. L'ordre de la grille ──
create index if not exists collectif_photos_arrivee_idx
  on public.collectif_photos (edition_id, confirmee_le, id);

-- PostgREST relit le schéma : sans cela, la vue et la table répondent
-- PGRST205 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
