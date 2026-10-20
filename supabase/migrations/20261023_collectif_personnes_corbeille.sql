-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : les PERSONNES, la CORBEILLE, l'OUVERTURE du dépôt
-- (planches du 20/10, Audencia, T-198 et T-199 ; décisions de Mathias du 20/10).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Ce qu'elle pose, et rien d'autre :
--
-- 1. `collectif_participants` : une personne d'une édition, reconnue par son
--    ADRESSE (normalisée en minuscules, unique par édition). Prénom et nom sont
--    donnés la première fois et ne se corrigent que par le responsable ou
--    l'atelier (`renomme_le`). Une fusion ne supprime rien : la personne
--    absorbée garde sa ligne et pointe vers celle qui reste (`fusionne_dans`),
--    pour qu'une adresse déjà tapée retrouve la bonne personne et que l'atelier
--    puisse défaire la fusion (le journal garde les photos déplacées).
--    ⚠️ L'adresse n'est PAS vérifiée (décision du 20/10) : elle reconnaît, elle
--    ne prouve rien.
-- 2. `collectif_participants_appareils` : quel téléphone (le cookie httpOnly
--    `bj_depot_appareil`, déjà écrit sur chaque photo) parle pour quelle
--    personne dans une édition. Un téléphone = une personne par édition (clé
--    primaire) ; « Ce n'est pas toi ? » retire la ligne, les photos restent à
--    leur personne.
-- 3. Trois colonnes sur `collectif_photos` :
--    - `participant_id` : la personne, quand elle est connue ;
--    - `supprimee_le`, `supprimee_par` : la CORBEILLE (30 jours, `corbeille.ts`).
--      Une photo à la corbeille disparaît de toutes les lectures ; elle se
--      restaure en vidant les deux colonnes ; la purge quotidienne efface ses
--      objets du coffre puis sa ligne. `supprimee_par` dit QUI l'a supprimée :
--      son auteur (sa place se libère), le responsable ou l'atelier.
-- 4. `collectif_editions.ouverture_le` : l'heure avant laquelle le lien des
--    participants refuse les dépôts (facultatif : vide, il reçoit dès la
--    création, comme aujourd'hui).
-- 5. La VUE `collectif_photos_resume` (20261022) REDÉFINIE : elle écarte les
--    photos à la corbeille et regroupe par PERSONNE quand elle est connue
--    (le téléphone ne sert plus qu'aux participants sans adresse). ⚠️ `create
--    or replace view` exige les colonnes d'avant, dans le même ordre et du même
--    type : elles sont reprises telles quelles, `participant_id` s'ajoute EN
--    FIN. ⚠️ `collectif_photos` a DÉJÀ des colonnes `appareil` et `appareil_id` :
--    la colonne calculée garde le nom `appareil_cle` (l'erreur 42702 du 20/10).
-- 5 bis. La vue `collectif_photos_album` (NEUVE, audit du 20/10, C1) : les
--    comptes de l'album d'un lien en quelques lignes, au lieu de relire toutes
--    ses photos à chaque ouverture.
-- 6. Les index : la personne, la corbeille (partiel : seules les photos
--    supprimées y entrent).
--
-- Aucune donnée n'est écrite, aucune ligne ne bouge : toutes les colonnes
-- arrivent vides (une photo d'avant n'a pas de personne, aucune n'est à la
-- corbeille). Atomique (begin / commit) et rejouable (`if not exists`, `or
-- replace`, contraintes posées dans un `do` qui regarde `pg_constraint`).
-- RLS activée sans politique sur les deux tables, fermées à `anon` et
-- `authenticated` : tout passe par la service key, côté serveur.
--
-- SANS ELLE, le code tourne déjà : les lectures se replient sans les colonnes
-- (42703 / PGRST204 / PGRST205 : aucune photo n'est à la corbeille, aucune
-- personne n'est connue, le plafond reste compté par téléphone) ; chaque
-- écriture nouvelle (se présenter par son adresse, supprimer, restaurer,
-- renommer, fusionner, régler l'ouverture) répond 503
-- `migration_personnes_absente` en nommant ce fichier.
--
-- Vérifier après l'avoir appliquée (lecture seule) :
--   select table_name from information_schema.tables
--    where table_name in ('collectif_participants', 'collectif_participants_appareils');
--   select column_name, data_type from information_schema.columns
--    where table_name = 'collectif_photos'
--      and column_name in ('participant_id', 'supprimee_le', 'supprimee_par');
--   select column_name from information_schema.columns
--    where table_name = 'collectif_editions' and column_name = 'ouverture_le';
--   select column_name, ordinal_position from information_schema.columns
--    where table_name = 'collectif_photos_resume' order by ordinal_position;
--     (17 colonnes, `participant_id` en dernier)
--   select sum(n) from public.collectif_photos_resume;
--   select sum(n) from public.collectif_photos_album;
--   select count(*) from public.collectif_photos
--    where confirmee_le is not null and supprimee_le is null;
--     (les TROIS nombres sont ÉGAUX)
-- puis, la donnée qui ARRIVE (le repli l'effacerait en silence) : après une
-- première présentation et un premier envoi d'un participant,
--   select id, email, prenom, nom from public.collectif_participants order by created_at desc limit 3;
--   select participant_id, deposant from public.collectif_photos
--    where participant_id is not null order by created_at desc limit 3;
-- et après une première suppression :
--   select supprimee_le, supprimee_par from public.collectif_photos where supprimee_le is not null limit 3;
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Les personnes ──
create table if not exists public.collectif_participants (
  id              uuid primary key default gen_random_uuid(),
  edition_id      uuid not null references public.collectif_editions(id) on delete cascade,
  -- l'adresse telle que `normaliserEmail` la rend (personnes.ts) : minuscules, sans blanc
  email           text not null check (
                    length(email) between 3 and 254
                    and email = lower(btrim(email))
                    and position('@' in email) > 1
                  ),
  prenom          text not null check (length(btrim(prenom)) between 1 and 80),
  nom             text not null check (length(btrim(nom)) between 1 and 80),
  -- le lien par lequel la personne s'est présentée la première fois (vide : le lien général)
  premier_lien_id uuid references public.collectif_provenances(id) on delete set null,
  created_at      timestamptz not null default now(),
  -- la dernière présentation (même adresse, n'importe quel téléphone)
  vu_le           timestamptz not null default now(),
  -- le dernier renommage par le responsable ou l'atelier (le participant ne se renomme pas)
  renomme_le      timestamptz,
  -- la personne qui reste après une fusion ; ses photos y sont parties
  fusionne_dans   uuid references public.collectif_participants(id) on delete set null,
  fusionne_le     timestamptz,

  constraint collectif_participants_email_unique unique (edition_id, email),
  -- (pas de contrainte qui lie `fusionne_dans` et `fusionne_le` : le `set null`
  -- de la clé étrangère la violerait ; le code écrit et efface les deux ensemble)
  constraint collectif_participants_pas_soi check (fusionne_dans is null or fusionne_dans <> id)
);

alter table public.collectif_participants enable row level security;
revoke all on public.collectif_participants from anon, authenticated;

comment on table public.collectif_participants is
  'Une personne d''une édition collective, reconnue par son adresse (NON vérifiée). Fusionnée : `fusionne_dans` pointe vers celle qui reste.';

-- ── 2. Quel téléphone parle pour quelle personne ──
create table if not exists public.collectif_participants_appareils (
  edition_id     uuid not null references public.collectif_editions(id) on delete cascade,
  -- le cookie httpOnly `bj_depot_appareil` (collecte.ts), 22 caractères aléatoires
  appareil_id    text not null check (appareil_id ~ '^[A-Za-z0-9_-]{22}$'),
  participant_id uuid not null references public.collectif_participants(id) on delete cascade,
  created_at     timestamptz not null default now(),
  vu_le          timestamptz not null default now(),

  primary key (edition_id, appareil_id)
);

create index if not exists collectif_participants_appareils_personne_idx
  on public.collectif_participants_appareils (participant_id);

alter table public.collectif_participants_appareils enable row level security;
revoke all on public.collectif_participants_appareils from anon, authenticated;

comment on table public.collectif_participants_appareils is
  'Le téléphone (cookie bj_depot_appareil) d''une personne dans une édition. Un téléphone, une personne ; « Ce n''est pas toi ? » retire la ligne.';

-- ── 3. La personne et la corbeille, sur chaque photo ──
alter table public.collectif_photos
  add column if not exists participant_id uuid references public.collectif_participants(id) on delete set null;

alter table public.collectif_photos
  add column if not exists supprimee_le timestamptz;

alter table public.collectif_photos
  add column if not exists supprimee_par text
  check (supprimee_par is null or supprimee_par in ('auteur', 'responsable', 'atelier'));

-- Une photo est à la corbeille avec sa date ET son auteur, ou ni l'un ni l'autre.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'collectif_photos_corbeille_complete'
  ) then
    alter table public.collectif_photos
      add constraint collectif_photos_corbeille_complete
      check ((supprimee_le is null) = (supprimee_par is null));
  end if;
end $$;

comment on column public.collectif_photos.participant_id is
  'La personne (collectif_participants) qui a envoyé la photo, quand elle s''est présentée par son adresse. Vide : photo d''avant, responsable, atelier.';
comment on column public.collectif_photos.supprimee_le is
  'À la corbeille depuis (30 jours, corbeille.ts). Vide : la photo est visible.';
comment on column public.collectif_photos.supprimee_par is
  'Qui l''a mise à la corbeille : auteur (sa place se libère), responsable, atelier.';

-- ── 4. L'ouverture du dépôt ──
alter table public.collectif_editions
  add column if not exists ouverture_le timestamptz;

comment on column public.collectif_editions.ouverture_le is
  'Avant cette heure, le lien des participants refuse les dépôts (ouverture.ts). Vide : il reçoit dès la création.';

-- ── 5. Le résumé des photos, sans la corbeille, par personne ──
-- Les seize colonnes d'avant, dans le même ordre et du même type (`create or
-- replace view` l'exige), puis `participant_id`. Le téléphone (`appareil_cle`)
-- ne départage plus que les participants SANS personne connue (« Sans nom »,
-- `compterPersonnes`) : une personne qui envoie depuis deux téléphones fait
-- une seule ligne par lien et par nom.
create or replace view public.collectif_photos_resume
  with (security_invoker = true) as
select
  p.edition_id,
  md5(row(p.role_deposant, p.provenance_id, p.provenance_type, p.deposant, p.appareil_cle, p.participant_id)::text) as id,
  p.role_deposant,
  p.provenance_id,
  p.provenance_type,
  p.deposant,
  p.appareil_cle as appareil_id,
  count(*)::integer as n,
  (count(*) filter (where p.preselection))::integer as n_selection,
  (count(*) filter (where not p.signalee and not p.preselection))::integer as n_choisissables,
  min(p.confirmee_le) as premiere,
  (array_agg(p.id order by p.confirmee_le, p.id))[1] as premiere_photo,
  max(p.confirmee_le) as derniere,
  max(p.confirmee_le) filter (where p.vignette_key is not null) as vignette_le,
  (array_agg(p.id order by p.confirmee_le desc, p.id desc) filter (where p.vignette_key is not null))[1] as vignette_photo,
  (array_agg(p.vignette_key order by p.confirmee_le desc, p.id desc) filter (where p.vignette_key is not null))[1] as vignette_key,
  p.participant_id
from (
  select c.*,
         case
           when c.participant_id is null and (c.role_deposant = 'participant' or c.provenance_id is not null)
             then c.appareil_id
         end as appareil_cle
    from public.collectif_photos c
   where c.confirmee_le is not null
     and c.supprimee_le is null
) p
group by p.edition_id, p.role_deposant, p.provenance_id, p.provenance_type, p.deposant, p.appareil_cle, p.participant_id;

comment on view public.collectif_photos_resume is
  'Une ligne par façon d''avoir déposé (T-168), hors corbeille, par personne quand elle est connue (20261023). Lue par la clé de service seulement.';

revoke all on public.collectif_photos_resume from anon, authenticated;

-- ── 5 bis. Les comptes de l'album d'un lien (audit du 20/10, C1) ──
-- La page 0 de l'album dit « 214 photos, 9 personnes ». Elle relisait toutes
-- les photos du lien pour les compter ; elle lit ici quelques lignes : une par
-- lien, version d'accord, personne, nom et (participant sans personne)
-- téléphone, avec le nombre de photos arrivées HORS corbeille. Le code pose le
-- lien et les versions de l'album (`filtreVueAlbum`, album.ts) ; aucune version
-- n'est écrite ici. Une vue NEUVE : rien à reprendre d'une définition d'avant.
-- (Comme pour le résumé, la colonne calculée garde le nom `appareil_cle` dans la
-- sous-requête : `c.*` porte déjà `appareil_id`.)
create or replace view public.collectif_photos_album
  with (security_invoker = true) as
select
  p.edition_id,
  md5(row(p.role_deposant, p.provenance_id, p.accord_version, p.participant_id, p.deposant, p.appareil_cle)::text) as id,
  p.role_deposant,
  p.provenance_id,
  p.accord_version,
  p.participant_id,
  p.deposant,
  p.appareil_cle as appareil_id,
  count(*)::integer as n
from (
  select c.*,
         case when c.participant_id is null then c.appareil_id end as appareil_cle
    from public.collectif_photos c
   where c.confirmee_le is not null
     and c.supprimee_le is null
) p
group by p.edition_id, p.role_deposant, p.provenance_id, p.accord_version, p.participant_id, p.deposant, p.appareil_cle;

comment on view public.collectif_photos_album is
  'Les comptes de l''album d''un lien (C1, 20/10) : photos arrivées hors corbeille, par lien, version d''accord, personne, nom. Lue par la clé de service seulement.';

revoke all on public.collectif_photos_album from anon, authenticated;

-- ── 6. Les index ──
create index if not exists collectif_photos_personne_idx
  on public.collectif_photos (edition_id, participant_id)
  where participant_id is not null;

-- La corbeille d'une édition, et la purge quotidienne de toutes les éditions :
-- seules les photos supprimées entrent dans cet index.
create index if not exists collectif_photos_corbeille_idx
  on public.collectif_photos (edition_id, supprimee_le)
  where supprimee_le is not null;

-- PostgREST relit le schéma : sans cela, les tables et les colonnes répondent
-- PGRST205 / PGRST204 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
