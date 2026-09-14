-- ════════════════════════════════════════════════════════════════════════
-- L'ATELIER — archiver un dossier (T-113, 14/09/2026).
--
-- À rouler sur le projet Supabase de production.
-- Additive : UNE colonne nullable. Rien n'est réécrit, et le code dégrade
-- tant qu'elle n'existe pas — les boutons « Archiver » et « Supprimer
-- définitivement » répondent 503 et l'écran dit pourquoi ; la table de
-- travail, la relève et la page cliente lisent comme avant.
--
-- ── POURQUOI ───────────────────────────────────────────────────────────
-- Mathias, le 14/09 : « que je puisse supprimer un projet, qu'on puisse
-- l'archiver en cas de problème, qu'on puisse le récupérer, mais avec un
-- supprimé définitivement également ». Jusqu'ici, retirer un dossier de
-- test passait par un script en ligne de commande (supprimer-dossiers.ts)
-- ou par une phrase à l'assistant.
--
-- ── CE QUE LA COLONNE VEUT DIRE ────────────────────────────────────────
-- NULL = dossier vivant (le cas normal). Une date = archivé : il disparaît
-- de la table de travail (sauf le filtre « Archivés »), la relève quotidienne
-- ne lui envoie plus rien, sa page /numero/<token> répond 404 et il sort de
-- l'espace compte. RÉVERSIBLE : « Récupérer » remet NULL. La suppression
-- définitive (photos du coffre R2, puis la ligne et tout ce qui cascade) ne
-- part QUE d'un dossier archivé : deux gestes, jamais un seul clic.
--
-- Pas un état de la machine (`atelier_etat`) : archiver ne fait pas avancer
-- un numéro, il le met de côté. L'état reste ce qu'il était, et il revient
-- tel quel à la récupération. Qui a archivé, et quand, est dans `evenements`
-- (`dossier_archive`, `dossier_restaure`) : la colonne dit l'état présent,
-- le journal dit l'histoire.
-- ════════════════════════════════════════════════════════════════════════

alter table public.numeros add column if not exists archive_le timestamptz;

comment on column public.numeros.archive_le is
  'Archivé (mis de côté, réversible) à cette date. NULL = dossier vivant. Posé par /api/admin/atelier/archiver.';

-- La relève et l'espace compte demandent « les archivés » ou « pas archivé » :
-- index partiel, il ne pèse que ce qui est réellement archivé (rare).
create index if not exists numeros_archive_le_idx
  on public.numeros (archive_le)
  where archive_le is not null;
