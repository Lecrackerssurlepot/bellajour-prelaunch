-- ════════════════════════════════════════════════════════════════════════
-- T-076 — LA RÉTENTION DES DOSSIERS ABANDONNÉS
--
-- ⚠️ À APPLIQUER PAR MATHIAS. Personne d'autre ne roule les migrations.
--
-- Décision de Mathias, 01/09/2026 : rétention de 90 jours, ANONYMISATION
-- plutôt que suppression, avec un préavis par mail (M10) 7 jours avant.
--
-- Une seule colonne, sur `numeros`. Strictement additive, nullable, sans
-- valeur par défaut : appliquée sur une base pleine, elle ne change RIEN.
--
-- ── POURQUOI UNE COLONNE ET PAS UNE DÉDUCTION ───────────────────────────
-- On pourrait reconnaître un dossier refermé à son email vide. Trois raisons
-- de ne pas s'en contenter :
--   1. LA PREUVE. « Quand avez-vous effacé mes données ? » est une question
--      à laquelle il faut savoir répondre par une date, pas par une
--      inférence. `evenements` porte la même trace, mais le journal se lit
--      dossier par dossier ; la colonne se filtre.
--   2. LA NON-RÉPÉTITION. Le script ne doit pas repasser tous les jours sur
--      des lignes déjà vidées et rejournaliser une anonymisation qui a eu
--      lieu en septembre.
--   3. T-023 (les photos orphelines sur R2). Ce ticket veut croiser le
--      coffre et la table `photos` : « un objet sans ligne est orphelin, une
--      ligne sans objet est un bug plus grave ». Après une anonymisation, les
--      lignes `photos` RESTENT (aucune suppression de ligne) alors que les
--      objets R2 sont partis : c'est exactement le motif que T-023 doit
--      signaler comme grave, et c'est ici parfaitement normal. Le futur
--      script devra donc exclure les dossiers dont `anonymise_le` est posé.
--      Sans cette colonne, il n'aurait aucun moyen de faire la différence.
--
-- ── LE REPLI 42703 EST DÉJÀ ÉCRIT, ET IL EST VOLONTAIREMENT ASYMÉTRIQUE ──
-- `scripts/anonymiser-dossiers.ts` :
--   — en LECTURE (le dry-run, son mode par défaut), l'absence de colonne est
--     rattrapée par un second select sans elle. Le script continue de
--     fonctionner et de dire ce qu'il ferait ;
--   — en ÉCRITURE (`--vraiment`), il REFUSE d'agir tant que la colonne
--     n'existe pas. C'est le seul endroit du dépôt où le repli ne consiste
--     pas à continuer sans la colonne, et c'est délibéré : le revers connu du
--     repli est de faire disparaître le champ du patch EN SILENCE
--     (supabase/CLAUDE.md). Ici, ce silence anonymiserait des dossiers sans
--     jamais le noter, et le passage suivant recommencerait sur les mêmes.
--
-- ⚠️ APRÈS APPLICATION : vérifier que la donnée ARRIVE vraiment, pas
-- seulement que le script s'affiche. Le dry-run doit cesser d'écrire
-- « colonne anonymise_le absente » en tête de sa sortie.
--
-- Aucun index : ce n'est pas un critère de recherche, c'est un drapeau lu
-- une fois par passage de script, sur une table qui se compte en centaines
-- de lignes.
-- ════════════════════════════════════════════════════════════════════════

alter table public.numeros
  add column if not exists anonymise_le timestamptz null;

comment on column public.numeros.anonymise_le is
  'T-076 — date d''anonymisation du dossier (rétention 90 jours). Posée par scripts/anonymiser-dossiers.ts, jamais par une route web. null = dossier intact. Une ligne anonymisée garde ses horodatages et ses compteurs : les métriques restent justes.';
