-- Le genre d'une note du carnet de l'atelier — T-096, marche 1 (08/09).
--
-- Le carnet accumule deux choses qui n'ont rien à voir : une règle de
-- composition (« beaucoup d'intérieur, éviter les cadres blancs ») et une
-- relance téléphonique (« elle paie vendredi »). Sans genre, l'écran
-- /admin/atelier/carnet les mélange, et le corpus qui doit devenir le cahier
-- des charges du moteur de mise en page se dilue dans de l'exploitation.
--
-- Les cinq mots sont ceux tranchés par Mathias le 08/09 :
--   photos  — ce que disent les images (cadrage, lumière, ce qu'on garde)
--   recit   — ce que dit l'histoire (ton, fil, ce qu'on met en avant)
--   page    — une décision de mise en page (une double, un rythme, un blanc)
--   cliente — ce qu'elle a demandé, ou ce qu'il faut savoir d'elle
--   atelier — l'exploitation : relance, impression, incident
--
-- NULLABLE, et sans contrainte de valeur. Deux raisons, et elles comptent :
--
--   1. le texte libre reste le cœur. Une note doit continuer de prendre trois
--      secondes ; si le genre devient obligatoire, on cesse d'écrire et le
--      corpus meurt. Une note sans genre est valide, et l'écran la montre.
--
--   2. pas de `check` ni d'enum : le vocabulaire d'un métier bouge. Ajouter un
--      sixième mot doit être un déploiement de code, pas une migration. La
--      validation vit dans `src/lib/atelier/carnet.ts` (GENRES_NOTE), au même
--      endroit que les libellés affichés.
--
-- Tant que cette migration n'est pas passée, RIEN ne casse. Les lectures
-- replient en 42703 et les écritures en PGRST204 (la règle des deux codes,
-- supabase/CLAUDE.md) : le carnet fonctionne sans genre, exactement comme
-- avant, et les boutons se taisent.
alter table public.notes
  add column if not exists genre text null;

-- L'index sert l'écran /admin/atelier/carnet, qui filtre par genre sur la
-- table entière. Partiel : les notes sans genre sont la majorité au départ et
-- ne se filtrent jamais par cette colonne.
create index if not exists notes_genre_idx
  on public.notes (genre)
  where genre is not null;
