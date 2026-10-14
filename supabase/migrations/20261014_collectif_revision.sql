-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : la révision du 13/10/2026 (PRD §14.8, T-147).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Atomique (begin / commit) et idempotente (`if not exists`) : la rejouer ne
-- change rien. Le code lit avec un REPLI tant qu'elle n'est pas passée
-- (`colonneAbsente`, 42703 / PGRST204) et répond un vrai 503
-- `migration_revision_absente` à toute ÉCRITURE qui en a besoin : jamais
-- d'écriture retentée en silence sans la colonne (le plafond choisi
-- disparaîtrait).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── Le plafond d'un lien de contribution (§14.2) ──
-- Chaque lien a SON plafond, compté par personne (par appareil, sur ce lien).
-- null + sans_plafond = vrai : « Sans limite » ; null + sans_plafond = faux :
-- un lien d'avant la révision, qui garde l'ancienne règle (le plafond par
-- participant de l'édition). Le plafond total de l'édition compte toujours tout.
alter table public.collectif_provenances
  add column if not exists plafond_par_personne integer
  check (plafond_par_personne is null or plafond_par_personne >= 1);

-- ── Le document cité dans un message (§14.5) ──
-- « Citer un document » : le devis signé, une facture, une proposition…
-- Un document retiré n'efface pas le message : la référence passe à null.
alter table public.collectif_messages
  add column if not exists document_id uuid
  references public.collectif_documents(id) on delete set null;

-- ── La pièce jointe d'un message (§14.5) ──
-- Une clé du coffre (`collectif/<id>/messages/<uuid>.<ext>`) et le nom
-- d'origine, pour le téléchargement. Le texte du message reste obligatoire :
-- un fichier envoyé seul prend « Fichier joint : <nom> ».
alter table public.collectif_messages
  add column if not exists piece_jointe_key text;
alter table public.collectif_messages
  add column if not exists piece_jointe_nom text;

create index if not exists collectif_messages_document_idx
  on public.collectif_messages (document_id)
  where document_id is not null;

-- PostgREST relit le schéma : sans cela, les nouvelles colonnes répondent
-- PGRST204 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
