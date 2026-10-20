-- ════════════════════════════════════════════════════════════════════════
-- T-203 — LES DOSSIERS LIVRÉS : PHOTOS ET FICHIER HD, 90 JOURS APRÈS LA LIVRAISON
--
-- ⚠️ À APPLIQUER PAR MATHIAS. Personne d'autre ne roule les migrations.
-- Écrite le 20/10/2026, PAS appliquée.
--
-- La politique de confidentialité en ligne (§7) promet : « Photos
-- téléversées + fichier HD : supprimées 90 jours après la livraison ».
-- `scripts/retention-livres.ts` le fait, à la main, dossier livré par dossier
-- livré (aucun automatisme). Il lui faut un MARQUEUR : une seule colonne, sur
-- `numeros`. Strictement additive, nullable, sans valeur par défaut :
-- appliquée sur une base pleine, elle ne change RIEN.
--
-- ── POURQUOI UNE COLONNE ET PAS LE JOURNAL ──────────────────────────────
-- Mêmes trois raisons que `anonymise_le` (20260901) :
--   1. LA PREUVE : « quand avez-vous effacé mes photos ? » se répond par une
--      date qui se filtre, pas par une lecture du journal dossier par dossier ;
--   2. LA NON-RÉPÉTITION : le marqueur se pose une seule fois
--      (`.is("photos_supprimees_le", null)`), et c'est lui qui LIBÈRE les clés
--      du coffre pour la reprise (`clesLibresLivre`) ;
--   3. T-023 (les orphelins du coffre) : après cet effacement, les lignes
--      `photos` RESTENT sans objet derrière elles ; le marqueur dit que c'est
--      normal pour ce dossier.
-- Même nom que la colonne des éditions collectives (`collectif_editions.
-- photos_supprimees_le`, 20261013) : le même fait, dit de la même façon.
--
-- ── LE REPLI, VOLONTAIREMENT ASYMÉTRIQUE (patron de 20260901) ───────────
--   — en LECTURE (le dry-run, mode par défaut du script), l'absence de la
--     colonne est rattrapée par un second select sans elle : le script
--     continue de dire ce qu'il ferait, et le DIT en tête de sa sortie ;
--   — en ÉCRITURE (`--vraiment`), il REFUSE d'agir sans elle : le revers
--     connu du repli est de faire disparaître le champ en silence, et ce
--     silence effacerait des photos sans jamais le noter.
--
-- ⚠️ AVANT DE L'APPLIQUER, savoir ce qu'elle ouvre : avec elle, `--vraiment`
-- devient possible. Les écrans des particuliers (la fiche de l'atelier,
-- `/numero`, `/compte`) ne lisent PAS encore ce marqueur : un dossier effacé y
-- montrerait des vignettes cassées (fiche) et perdrait son bouton
-- « Télécharger » sans un mot (`/numero`, `/compte`). Voir T-203.
--
-- ⚠️ APRÈS APPLICATION : vérifier que la donnée ARRIVE vraiment (supabase/
-- CLAUDE.md, « le repli a un revers ») :
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'numeros' and column_name = 'photos_supprimees_le';
-- puis le dry-run doit cesser d'écrire « colonne photos_supprimees_le absente »,
-- et, après le PREMIER `--vraiment` (accord de Mathias), le dossier traité doit
-- porter la date :
--   select id, photos_supprimees_le from public.numeros where photos_supprimees_le is not null;
--
-- Aucun index : un drapeau lu une fois par passage de script, sur une table
-- qui se compte en centaines de lignes.
-- ════════════════════════════════════════════════════════════════════════

alter table public.numeros
  add column if not exists photos_supprimees_le timestamptz null;

comment on column public.numeros.photos_supprimees_le is
  'T-203 — date à laquelle les photos téléversées et le fichier HD d''un dossier LIVRÉ ont été effacés du coffre (90 jours après la livraison, politique de confidentialité §7). Posée par scripts/retention-livres.ts, jamais par une route web. null = rien effacé. La ligne, son journal, son prix, son adresse et sa facture restent.';
