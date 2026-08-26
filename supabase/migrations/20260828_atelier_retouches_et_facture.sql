-- T2-13 : « j'ai demandé des retouches » suspend l'auto-validation à J+7.
-- La colonne porte la DATE du geste (pas un booléen) : la fiche admin dit
-- « le 28/08 », et null = aucune retouche en attente. Elle est remise à null
-- quand l'atelier republie la maquette (l'échéance J+7 repart alors de zéro).
alter table public.numeros
  add column if not exists retouches_demandees_le timestamptz null;

-- T2-11 : le lien « Votre facture » de la page d'après-paiement.
-- hosted_invoice_url de Stripe, capté au webhook checkout.session.completed
-- (best-effort : null si la facture n'était pas encore finalisée à l'instant T).
alter table public.numeros
  add column if not exists facture_url text null;
