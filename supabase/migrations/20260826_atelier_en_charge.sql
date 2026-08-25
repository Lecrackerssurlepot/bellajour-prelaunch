-- ════════════════════════════════════════════════════════════════════════
-- L'ATELIER — qui a ce dossier en main (lot 7C).
--
-- À rouler sur le projet Supabase de production.
-- Additive : UNE colonne nullable. Rien n'est réécrit, et le code dégrade
-- tant qu'elle n'existe pas — la liste et la fiche s'affichent sans le
-- sélecteur plutôt que de tomber en panne.
--
-- ── POURQUOI ───────────────────────────────────────────────────────────
-- Recette du 25/08 : « avoir la personne en charge, Louis ou Mathias, pour
-- qu'on ne se mélange pas et pouvoir prendre le relais ».
--
-- À deux sur la même table de travail, sans marque, il n'y a que deux
-- issues : composer deux fois le même numéro, ou n'en composer aucun parce
-- que chacun croit que l'autre s'en occupe. La seconde est la plus probable
-- et la plus coûteuse : elle est silencieuse.
--
-- ── POURQUOI UNE COLONNE ET PAS UNE TABLE ──────────────────────────────
-- Un dossier a UNE personne en charge à un instant donné, pas un historique
-- d'affectations. Le récit des passages de relais existe déjà : chaque prise
-- et chaque relâche écrit dans `evenements` (invariant nº6), qui est
-- append-only et se relit. La colonne dit l'état présent, le journal dit
-- l'histoire — chacun son rôle, aucune duplication.
--
-- ── LA VALEUR ──────────────────────────────────────────────────────────
-- L'identifiant du compte ('mathias', 'louis'), le MÊME que `notes.qui` et
-- `dossiers_vus.qui` : il vient du cookie signé, jamais d'une saisie. NULL
-- veut dire « personne », ce qui est un état normal et non un défaut — la
-- plupart des dossiers n'ont besoin de personne tant qu'on ne les ouvre pas.
-- ════════════════════════════════════════════════════════════════════════

alter table public.numeros add column if not exists en_charge text;

-- « Montre-moi les miens » est le seul filtre qui porte sur cette colonne,
-- et il ne regarde jamais les dossiers sans personne. Index partiel : il ne
-- pèse que ce qui est réellement affecté.
create index if not exists numeros_en_charge_idx
  on public.numeros (en_charge)
  where en_charge is not null;
