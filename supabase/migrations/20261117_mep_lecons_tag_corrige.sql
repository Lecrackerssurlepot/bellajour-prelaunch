-- 17/11/2026 : « Lire les photos » (éditeur de mise en page). L'atelier corrige un tag posé par l'IA (rôle, sujet) : le geste
-- devient une leçon de type `tag_corrige` (règle IA, R194). La contrainte de 20261110 ne connaît pas ce type.
--
-- ÉCRITE, PAS APPLIQUÉE (17/11). Sans elle, la route `lecons` envoie les autres leçons et dit `perdues` pour celles-là : rien ne bloque.
-- Aucune donnée touchée : on remplace seulement la liste des types admis (l'ancienne liste + `tag_corrige`).
--
-- Vérifier après application :
--   select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.mep_lecons'::regclass and conname = 'mep_lecons_type_check';
--   -- attendu : la liste contient 'tag_corrige'

alter table public.mep_lecons drop constraint if exists mep_lecons_type_check;
alter table public.mep_lecons add constraint mep_lecons_type_check
  check (type in ('floue_gardee', 'pile_autre_gardee', 'pile_pas_un_doublon', 'tete_ecartee', 'pretri_renverse', 'tag_corrige', 'reponse', 'ouverture', 'export'));
