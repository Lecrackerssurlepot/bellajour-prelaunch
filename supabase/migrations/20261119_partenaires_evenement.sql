-- ══════════════════════════════════════════════════════════════════════════
-- /partenaires : les dates de l'événement et le nombre de participants (19/11/2026)
--
-- Demande de Mathias : ces données manquaient au formulaire, et elles servent
-- à la préparation de l'appel. `evenement_debut` et `evenement_fin` sont des
-- jours (la fin peut être le jour du début) ; `participants` un entier.
--
-- APPLIQUÉE le 19/11/2026 via le MCP Supabase, sur accord explicite de Mathias
-- (« Oui, applique »), et vérifiée : trois colonnes (date, date, integer), les
-- deux contraintes, et l'API de la base les lit (200).
--
-- Sans cette migration : le code replie (PGRST204 à l'écriture, 42703 à la
-- lecture), le rendez-vous passe, les trois valeurs vont dans l'événement Google
-- et dans le bloc envoyé à la routine, mais pas en base ni dans l'atelier.
--
-- Vérification après application :
--   select column_name, data_type from information_schema.columns
--   where table_name = 'collectif_rdv_prospects' and column_name in ('evenement_debut', 'evenement_fin', 'participants');
-- ══════════════════════════════════════════════════════════════════════════

begin;

alter table public.collectif_rdv_prospects
  add column if not exists evenement_debut date,
  add column if not exists evenement_fin   date,
  add column if not exists participants    integer check (participants is null or participants between 1 and 100000),
  add constraint collectif_rdv_prospects_evenement check (evenement_fin is null or evenement_debut is null or evenement_fin >= evenement_debut);

notify pgrst, 'reload schema';

commit;
