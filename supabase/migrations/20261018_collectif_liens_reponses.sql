-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : supprimer un lien, répondre à un message (retours de
-- Mathias du 14/10 au soir, T-152).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Atomique (begin / commit) et idempotente (`if not exists`) : la rejouer ne
-- change rien. Le code lit avec un REPLI tant qu'elle n'est pas passée
-- (`colonneAbsente`) et répond un vrai 503 `migration_liens_absente` à toute
-- ÉCRITURE qui en a besoin.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── Supprimer un lien de contribution ──
-- Le lien ne reçoit plus rien (la page de dépôt répond « introuvable ») et
-- sort de l'onglet « Les liens » ; ses photos RESTENT, dans son dossier.
-- Jamais un DELETE : les photos garderaient une provenance nulle et
-- tomberaient dans « Tous les participants ».
alter table public.collectif_provenances
  add column if not exists retire_le timestamptz;

-- ── Répondre à un message précis ──
-- « Répondre » au survol : le message dit auquel il répond ; un message
-- retiré n'efface pas la réponse (la référence passe à null).
alter table public.collectif_messages
  add column if not exists reponse_a uuid
  references public.collectif_messages(id) on delete set null;

-- PostgREST relit le schéma : sans cela, les nouvelles colonnes répondent
-- PGRST204 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
