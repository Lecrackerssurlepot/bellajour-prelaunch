-- Le crédit fondateur consommé, VISIBLE en base (04/09).
--
-- La vérité vivait à trois endroits, aucun lisible d'un coup d'œil :
-- Stripe (max_redemptions: 1, l'autorité), le journal `evenements`
-- (credit_fondatrice_consomme, indexé par numero_fondateur), et rien sur
-- `waitlist`. Pour l'admin comme pour la segmentation de campagnes, il
-- fallait recouper. Ces deux colonnes DÉNORMALISENT le fait — le journal
-- reste la source de vérité, le webhook écrit ici en best-effort.
--
-- ⚠️ `offer_type` ne bouge PAS : un fondateur dont le crédit est consommé
-- RESTE fondateur (décision de Mathias, 03/09) — c'est toute la raison de
-- ces colonnes plutôt que d'un changement de statut.
--
-- Tant que cette migration n'est pas passée, rien ne casse : l'écriture du
-- webhook se tait en 42703 (le journal, lui, est toujours écrit) et la
-- fiche admin replie sur ses colonnes d'avant.
alter table public.waitlist
  add column if not exists credit_consomme_le timestamptz null;
alter table public.waitlist
  add column if not exists credit_code text null;
