-- emit-invoices : état transitoire 'emitting' pour le verrou anti-double-émission.
-- Le worker fait passer atomiquement un job 'pending'/'error' -> 'emitting'
-- (UPDATE ... WHERE status IN ('pending','error')). 0 ligne touchée = job déjà
-- pris par un autre run -> skip. Il faut donc autoriser 'emitting' dans le CHECK.
-- Migration purement additive sur la contrainte (drop + recreate), aucune donnée touchée.
ALTER TABLE public.invoice_jobs
  DROP CONSTRAINT IF EXISTS invoice_jobs_status_check;

ALTER TABLE public.invoice_jobs
  ADD CONSTRAINT invoice_jobs_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'emitting'::text, 'emitted'::text, 'error'::text]));
