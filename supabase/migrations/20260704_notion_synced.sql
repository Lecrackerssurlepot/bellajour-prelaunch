-- Sync CRM Notion : flag de synchronisation par ligne waitlist.
-- Posé à true par le workflow n8n "sync-supabase-notion" une fois la fiche créée
-- dans le CRM Notion → garantit l'idempotence (aucune fiche jamais recréée).
-- Colonne additive, NOT NULL DEFAULT false. N'altère aucune colonne existante.
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS notion_synced boolean NOT NULL DEFAULT false;
