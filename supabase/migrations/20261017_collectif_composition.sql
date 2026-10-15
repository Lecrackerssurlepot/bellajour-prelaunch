-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : le brief se compose pièce par pièce (D24, retours de
-- Mathias du 14/10, point 4, T-151).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Atomique (begin / commit) et idempotente (`if not exists`) : la rejouer ne
-- change rien. Le code lit avec un REPLI tant qu'elle n'est pas passée
-- (`colonneAbsente`) : un brief se lit alors comme avant (tout vient de
-- `style_id`), et prendre une pièce d'un AUTRE style répond 503
-- `migration_composition_absente`.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── De quel style viennent la palette et les typographies ──
-- Nul : la pièce vient de `style_id` (un brief d'avant D24, ou un style pris
-- en entier). Un style ne se supprime pas tant qu'un brief le nomme.
alter table public.collectif_magazines
  add column if not exists palette_style_id uuid
  references public.collectif_styles(id) on delete restrict;
alter table public.collectif_magazines
  add column if not exists typo_style_id uuid
  references public.collectif_styles(id) on delete restrict;

-- ── Les doubles pages aimées, chacune avec son style ──
-- [{ "style_id": "<uuid>", "double": "aeree" }, …], cinq au plus (contrôlé
-- par le code). Vide : les doubles pages se lisent dans `doubles` (types du
-- style `style_id`), comme avant D24 ; le code tient `doubles` à jour.
alter table public.collectif_magazines
  add column if not exists doubles_aimes jsonb not null default '[]'::jsonb;

-- PostgREST relit le schéma : sans cela, les nouvelles colonnes répondent
-- PGRST204 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
