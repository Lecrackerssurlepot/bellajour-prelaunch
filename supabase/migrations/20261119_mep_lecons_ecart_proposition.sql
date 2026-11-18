-- 18/11/2026 : le relevé des différences de l'éditeur de mise en page (« je repasserai après toi »). Ce que l'atelier change dans la
-- proposition du compositeur (photo ajoutée, retirée, agrandie, déplacée, gabarit, recadrage, texte, double, couverture) devient une
-- leçon de type `ecart_proposition`, rattachée à la règle de la décision de la machine (`compositeur/releve.ts`).
--
-- ÉCRITE, PAS APPLIQUÉE. Sans elle, la route `lecons` envoie ces leçons sous le type `pretri_renverse` (déjà admis, compté par règle),
-- le vrai type en tête de `proposition` (« ecart_proposition · … ») : rien ne bloque, rien n'est perdu.
-- Aucune donnée touchée : on remplace seulement la liste des types admis (celle de 20261117 + `ecart_proposition`).
--
-- Vérifier après application :
--   select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.mep_lecons'::regclass and conname = 'mep_lecons_type_check';
--   -- attendu : la liste contient 'ecart_proposition'

alter table public.mep_lecons drop constraint if exists mep_lecons_type_check;
alter table public.mep_lecons add constraint mep_lecons_type_check
  check (type in ('floue_gardee', 'pile_autre_gardee', 'pile_pas_un_doublon', 'tete_ecartee', 'pretri_renverse', 'tag_corrige', 'ecart_proposition', 'reponse', 'ouverture', 'export'));
