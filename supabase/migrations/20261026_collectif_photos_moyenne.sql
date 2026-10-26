-- ════════════════════════════════════════════════════════════════════════
-- 5A — LA VERSION MOYENNE D'« AGRANDIR » (Édition collective)
--
-- ⚠️ À APPLIQUER PAR MATHIAS. Personne d'autre ne roule les migrations.
-- Écrite le 26/10/2026, PAS appliquée.
--
-- Décision de Mathias du 26/10 (campagne « rude épreuve », bug perf-5) : à
-- l'envoi, le navigateur fabrique en plus une version d'environ 1 600 px
-- (JPEG), rangée au coffre à côté de la vignette
-- (`collectif/<édition>/photos/<photo>/moyenne.jpg`, `cleMoyenne`). La
-- visionneuse « Agrandir » la montre à la place de l'original (3 Mo en
-- moyenne, mesuré sur l'édition réelle) ; l'original ne sert plus qu'au
-- téléchargement et à l'impression.
--
-- Une seule colonne, sur `collectif_photos`. Strictement additive, nullable,
-- sans valeur par défaut : appliquée sur une base pleine, elle ne change RIEN.
-- `null` = pas de version moyenne (photo d'avant, plus petite que 1 600 px,
-- navigateur qui n'a pas su la faire) : « Agrandir » montre l'original.
--
-- ── LE REPLI (supabase/CLAUDE.md) ───────────────────────────────────────
--   — en ÉCRITURE (`confirmerArrivee`, rattrapageCoffre.ts) : sans la colonne
--     (PGRST204 qui la nomme), la photo se confirme SANS elle ;
--   — en LECTURE (la grille, `lireAvecMoyenne`) : sans la colonne (42703 qui
--     la nomme), la même lecture sans elle, absence retenue une minute.
-- ⚠️ LE REVERS : pendant la fenêtre entre le déploiement et cette migration,
-- les moyennes partent au coffre mais leur clé n'est PAS notée. Après
-- l'avoir appliquée, lancer le rattrapage : il les retrouve au coffre (une
-- tête par photo) avant de fabriquer quoi que ce soit :
--     npx tsx --tsconfig tsconfig.json scripts/collectif-moyennes-rattrapage.ts            (lecture seule)
--     npx tsx --tsconfig tsconfig.json scripts/collectif-moyennes-rattrapage.ts --vraiment (écrit)
--
-- ── VÉRIFIER QU'ELLE EST PASSÉE, PUIS QUE LA DONNÉE ARRIVE ──────────────
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'collectif_photos' and column_name = 'moyenne_key';
--   -- attendu : une ligne, text, YES
--
--   -- puis, après un envoi réel de photos de plus de 1 600 px depuis un navigateur :
--   select count(*) filter (where moyenne_key is not null) as avec_moyenne, count(*) as toutes
--     from collectif_photos
--    where confirmee_le > now() - interval '1 hour';
--   -- attendu : avec_moyenne > 0. Zéro = le repli joue encore (cache PostgREST ?
--   -- `notify pgrst, 'reload schema';`) et la donnée se perd en silence.
-- ════════════════════════════════════════════════════════════════════════

begin;

alter table public.collectif_photos
  add column if not exists moyenne_key text;

comment on column public.collectif_photos.moyenne_key is
  'Version moyenne (≈ 1 600 px, JPEG) montrée par « Agrandir » ; null = l''original sert (5A, 26/10/2026).';

notify pgrst, 'reload schema';

commit;
