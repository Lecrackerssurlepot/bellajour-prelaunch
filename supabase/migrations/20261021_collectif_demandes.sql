-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : les demandes sur mesure (T-191, planche 12 du 19/10 au
-- soir, validée par Mathias : « je suis d'accord pour la migration de la
-- planche 12 (je l'appliquerai) »).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Ce qu'elle fait, et rien d'autre : elle RELÂCHE la contrainte de
-- `collectif_contenus.type`. Jusqu'ici la base n'acceptait que cinq valeurs
-- (logo, programme, mot, liste, rubrique) ; désormais le type est la CLÉ d'une
-- demande de l'édition (« logo », ou une clé tirée au sort comme
-- « d-k3j9x2a1b4 »), contrôlée par le code (`src/lib/collectif/demandes.ts`,
-- la route `/api/collectif/contenus` refuse une clé que l'édition ne demande
-- pas). Il reste un garde-fou de forme : 1 à 64 caractères.
-- Aucune colonne, aucune table, aucune donnée ne bouge : les envois déjà reçus
-- (types d'origine) restent valides.
--
-- Atomique (begin / commit) et rejouable : la rejouer ne change rien.
-- Sans elle, le code tourne déjà : les cinq clés d'origine marchent, et un
-- envoi sur une demande NOUVELLE répond un vrai 503
-- `migration_demandes_absente` (la route sonde AVANT d'écrire au coffre).
--
-- Vérifier après l'avoir appliquée (lecture seule) :
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.collectif_contenus'::regclass and contype = 'c';
-- doit montrer `collectif_contenus_quelque_chose` et
-- `collectif_contenus_type_forme`, et plus `collectif_contenus_type_check`.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- La contrainte d'origine s'appelle `collectif_contenus_type_check` (nom donné
-- par PostgreSQL à la contrainte écrite sur la colonne, migration 20261013).
alter table public.collectif_contenus
  drop constraint if exists collectif_contenus_type_check;

-- Si elle portait un autre nom (base montée à la main), on la retrouve par ce
-- qu'elle dit : une contrainte `check` de cette table qui nomme « rubrique ».
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.collectif_contenus'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%rubrique%'
  loop
    execute format('alter table public.collectif_contenus drop constraint %I', c.conname);
  end loop;
end
$$;

-- Le garde-fou qui reste : une clé, pas un texte libre de mille caractères.
alter table public.collectif_contenus
  drop constraint if exists collectif_contenus_type_forme;
alter table public.collectif_contenus
  add constraint collectif_contenus_type_forme
  check (char_length(type) between 1 and 64);

-- Plus aucune contrainte ne doit limiter le type aux cinq valeurs : sinon on
-- annule tout (la transaction ne laisse rien à moitié fait).
do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conrelid = 'public.collectif_contenus'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%rubrique%'
  ) then
    raise exception 'collectif_contenus : une contrainte limite encore le type aux cinq valeurs d''origine';
  end if;
end
$$;

comment on column public.collectif_contenus.type is
  'La clé de la demande de l''édition (collectif_editions.contenus_demandes, T-191) : une clé d''origine (logo, programme, mot, liste, rubrique) ou une clé tirée au sort. Contrôlée par le code.';

commit;
