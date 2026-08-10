-- ════════════════════════════════════════════════════════════════
-- FIX — collision UNIQUE(source) dans credit_ambassador_level2()
--
-- SYMPTÔME
--   Depuis le 2026-07-04 12:51, plus AUCUN mail post-paiement (F1/S1/P3/A3)
--   n'est parti. Paiement, facture et numéro Fondateur fonctionnaient.
--
-- CAUSE
--   pages_credits porte un index UNIQUE sur `source` SEUL
--   (pages_credits_source_uidx, migration 20260528_g3).
--   referral-credits.ts respecte cette contrainte en préfixant le crédit
--   niveau 0 : source = 'SELF:' || ref_code.
--   credit_ambassador_level2() n'a jamais suivi cette convention : elle insère
--   le crédit niveau 2 avec le ref_code BRUT du filleul N2 — déjà utilisé par
--   le crédit niveau 1 du parrain direct.
--   Son garde-fou `not exists` teste (email, source, niveau), donc il ne voit
--   pas la collision, qui porte sur `source` seul.
--   Premier déclenchement : crédit niveau 1 'BJ-ELOISE' créé à 12:51:48.
--   → la RPC lève 23505 à CHAQUE paiement, pour TOUT LE MONDE (elle balaye
--     toute la base, sans filtre sur l'acheteur courant), et le `return false`
--     du webhook coupait les envois juste avant.
--
-- CORRECTIF
--   Préfixer la source du niveau 2 ('N2:'), exactement comme 'SELF:' pour le
--   niveau 0. Le crédit niveau 2 peut enfin coexister avec le niveau 1.
--   + ON CONFLICT DO NOTHING en filet de sécurité : cette RPC ne doit plus
--     jamais pouvoir faire échouer un webhook de paiement.
--
--   niveau et filleul_email restent fournis explicitement, donc le trigger
--   set_pages_credits_meta (qui ne s'active que sur NULL) n'interfère pas —
--   important, car il résoudrait mal une source préfixée.
-- ════════════════════════════════════════════════════════════════

create or replace function public.credit_ambassador_level2()
returns void
language plpgsql
as $function$
begin
  insert into public.pages_credits (email, montant, source, niveau, filleul_email, status, applique)
  select amb.email, 5, 'N2:' || f2.ref_code, 2, f2.email, 'pending', false
  from public.waitlist amb
  join public.waitlist f1 on f1.referred_by = amb.ref_code
  join public.waitlist f2 on f2.referred_by = f1.ref_code
  where amb.is_ambassadeur = true
    and not exists (
      select 1 from public.pages_credits pc
      where pc.email = amb.email
        and pc.source = 'N2:' || f2.ref_code
        and pc.niveau = 2
    )
  on conflict (source) do nothing;
end;
$function$;
