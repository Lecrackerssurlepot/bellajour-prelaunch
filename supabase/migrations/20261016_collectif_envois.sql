-- ════════════════════════════════════════════════════════════════════════════
-- Édition collective : les envois du client (retours de Mathias du 14/10,
-- points 3 et 11, T-151).
-- ÉCRITE PAR CLAUDE CODE, APPLIQUÉE PAR MATHIAS (jamais d'ici).
--
-- Atomique (begin / commit) et idempotente (`if not exists`) : la rejouer ne
-- change rien. Le code lit avec un REPLI tant qu'elle n'est pas passée
-- (`colonneAbsente`, 42703 / PGRST204) et répond un vrai 503
-- `migration_envois_absente` à toute ÉCRITURE qui en a besoin.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── Remplacer un fichier sans rien perdre (point 3) ──
-- Un contenu peut avoir PLUSIEURS fichiers (le logo en couleur, le logo
-- blanc) ; « Remplacer » en ajoute un nouveau et range l'ancien comme
-- ANCIENNE VERSION : il reste au coffre et à l'atelier, il sort de l'écran
-- du client. Un fichier courant a `remplace_le` nul.
alter table public.collectif_contenus
  add column if not exists remplace_le timestamptz;
alter table public.collectif_contenus
  add column if not exists remplace_par uuid
  references public.collectif_contenus(id) on delete set null;

-- ── Citer un de ses envois dans un message (point 11) ──
-- « Le logo blanc, celui-ci » : le message pointe l'envoi. Un envoi retiré
-- n'efface pas le message : la référence passe à null.
alter table public.collectif_messages
  add column if not exists contenu_id uuid
  references public.collectif_contenus(id) on delete set null;

create index if not exists collectif_messages_contenu_idx
  on public.collectif_messages (contenu_id)
  where contenu_id is not null;

-- PostgREST relit le schéma : sans cela, les nouvelles colonnes répondent
-- PGRST204 jusqu'au prochain rechargement.
notify pgrst, 'reload schema';

commit;
