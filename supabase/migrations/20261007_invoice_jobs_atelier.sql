-- La vente atelier entre en facturation (T-075, 07/10/2026).
--
-- `invoice_jobs` n'a servi qu'aux acomptes de la prévente (16 lignes, toutes
-- `emitted`, la dernière du 24/08). Depuis, chaque vente atelier a été
-- facturée à la main dans InvoiceXpress. Cette migration prépare la table à
-- recevoir les jobs du webhook atelier, SANS toucher aux 16 lignes (seule
-- `origine` leur est posée, à 'acompte').
--
-- LES COLONNES NOUVELLES portent la décision prise côté site
-- (`src/lib/atelier/facturation.ts`) : la série, le taux, le TTC réellement
-- encaissé, et le client pour la série française. L'Edge Function
-- `emit-invoices` ne décide plus rien : elle lit et elle exécute.
--
-- LES STATUTS NOUVEAUX :
--   draft          brouillon créé chez InvoiceXpress, attend le contrôle humain
--                  (INVOICE_AUTO_FINALIZE n'est pas à "true")
--   manual_review  rien n'est émis : cas que la table de décision ne couvre pas
--                  (Madère, Açores, autre pays, numéro de TVA, écart de total…)
--   failed         trois tentatives ratées, on n'insiste plus
--   emitted_manual facturé à la main avant la mise en service : ne JAMAIS
--                  refacturer. La contrainte UNIQUE sur le payment intent
--                  interdit toute seconde ligne.
--
-- La contrainte UNIQUE(stripe_payment_intent) existe déjà
-- (`invoice_jobs_stripe_payment_intent_key`, vérifiée en base le 07/10).
--
-- DONNÉES PERSONNELLES : `client`, `payload_log` et `response_log` portent
-- nom et adresse. Ils sont vidés par l'anonymisation du dossier
-- (`scripts/anonymiser-dossiers.ts`) ; le numéro de fatura, les montants et
-- le pays restent, parce qu'une pièce fiscale se conserve.

alter table public.invoice_jobs
  add column if not exists numero_id uuid references public.numeros(id),
  add column if not exists origine text,
  add column if not exists pays_livraison text,
  add column if not exists code_postal text,
  add column if not exists taux_tva numeric,
  add column if not exists serie text,
  add column if not exists montant_ttc numeric,
  add column if not exists quantite integer,
  add column if not exists description text,
  add column if not exists client jsonb,
  add column if not exists motif_revue text;

update public.invoice_jobs set origine = 'acompte' where origine is null;

alter table public.invoice_jobs
  alter column origine set default 'acompte';

alter table public.invoice_jobs
  drop constraint if exists invoice_jobs_origine_check;
alter table public.invoice_jobs
  add constraint invoice_jobs_origine_check
  check (origine in ('acompte', 'atelier', 'manuel'));

alter table public.invoice_jobs
  drop constraint if exists invoice_jobs_status_check;
alter table public.invoice_jobs
  add constraint invoice_jobs_status_check
  check (status in ('pending', 'emitting', 'emitted', 'error',
                    'draft', 'manual_review', 'failed', 'emitted_manual'));

create index if not exists invoice_jobs_numero_id_idx on public.invoice_jobs (numero_id);

-- Les six ventes atelier facturées à la main (liste de Mathias, 07/10).
-- `join numeros` : une ligne dont le payment intent n'existe pas en base
-- n'est pas inscrite, plutôt qu'inscrite sans dossier.
insert into public.invoice_jobs
  (stripe_payment_intent, numero_id, status, origine, serie, fatura_numero,
   montant_ttc, pays_livraison, emitted_at)
select v.pi, n.id, 'emitted_manual', 'manuel', v.serie, v.num,
       v.ttc, n.pays_livraison, v.d
from (values
  ('pi_3UGd4j3Y5InoR09T1bt468aF', 'FAT2026', 'FAT2026/19', 22::numeric, '2026-09-17'::timestamptz),
  ('pi_3UHLI43Y5InoR09T1KyBDwXc', 'FAT2026', 'FAT2026/20', 17::numeric, '2026-09-19'::timestamptz),
  ('pi_3UIDkd3Y5InoR09T11ieN5Tj', 'FAT2026', 'FAT2026/21', 13::numeric, '2026-09-21'::timestamptz),
  ('pi_3UIns93Y5InoR09T0ySARMqv', 'FAT2026', 'FAT2026/22', 25::numeric, '2026-09-23'::timestamptz),
  ('pi_3UJyig3Y5InoR09T0mjbfijh', 'FAT2026', 'FAT2026/23', 22::numeric, '2026-09-26'::timestamptz),
  ('pi_3UN9uF3Y5InoR09T0MmH4r4o', 'FR2026',  'FR2026/1',   11::numeric, '2026-10-05'::timestamptz)
) as v(pi, serie, num, ttc, d)
join public.numeros n on n.stripe_payment_intent = v.pi
on conflict (stripe_payment_intent) do nothing;
