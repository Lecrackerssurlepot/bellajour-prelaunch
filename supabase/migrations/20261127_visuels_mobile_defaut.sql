-- 20261127_visuels_mobile_defaut.sql : la version téléphone, le cadrage et le défaut modifiable (Site · Visuels).
--
-- ADDITIVE : trois colonnes facultatives sur `visuels_rotations`, rien d'autre. Aucune ligne n'est modifiée.
-- ⚠️ À appliquer SEULEMENT avec l'accord explicite de Mathias.
--
-- Sans elle, le site et l'admin marchent comme avant (lecture en repli 42703) ; seule l'écriture
-- d'une version téléphone, d'un cadrage ou d'un défaut répond 503 `migration_visuels_v2_absente`
-- (jamais de champ perdu en silence).
--
-- Vérification après application :
--   select column_name, data_type, column_default from information_schema.columns
--    where table_name = 'visuels_rotations' and column_name in ('fichier_mobile', 'cadrage', 'defaut');  -- 3 lignes
--   select count(*) from public.visuels_rotations where defaut;                                        -- 0
--   notify pgrst, 'reload schema';  -- si l'admin répond encore 503 juste après

alter table public.visuels_rotations
  -- L'image montrée aux écrans de 700 px et moins. Nulle : la même image partout.
  add column if not exists fichier_mobile text,
  -- Le point de l'image gardé quand la page la recadre (`object-position`, « 50% 30% »). Nul : le centre.
  add column if not exists cadrage text,
  -- true : la ligne REMPLACE le visuel par défaut du code (ses dates ne comptent pas). La plus récente
  -- validée gagne ; les rotations datées passent toujours avant.
  add column if not exists defaut boolean not null default false;

alter table public.visuels_rotations
  drop constraint if exists visuels_rotations_cadrage;
alter table public.visuels_rotations
  add constraint visuels_rotations_cadrage check (cadrage is null or cadrage ~ '^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$');
