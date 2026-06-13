-- A3 (album offert au 6e parrainage = 30 pages confirmées niveau 1+2).
-- Flag anti-renvoi : posé atomiquement à l'envoi A3 (UPDATE ... WHERE a3_notified_at IS NULL),
-- empêche tout doublon sur les paiements suivants. Colonne additive, nullable, idempotente.
-- N'altère aucune colonne existante.
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS a3_notified_at timestamptz NULL;
