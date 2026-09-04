-- Le compte cliente — le lien explicite dossier ↔ compte (04/09).
--
-- Le système de comptes (Supabase Auth, « identité seulement ») s'AJOUTE au
-- token : /numero/<token> reste une identité complète, avec ou sans compte.
-- Cette colonne pose le lien EXPLICITE : quand une cliente connectée visite
-- son numéro ou charge son dashboard, on épingle le dossier à son compte.
-- Le rapprochement automatique par email_canonical continue d'exister en
-- lecture (il exige un email confirmé) ; l'épinglage le rend durable — il
-- survit à un changement d'adresse.
--
-- `on delete set null` : supprimer un compte (dashboard Supabase, demande
-- RGPD) détache les dossiers sans les toucher — le token continue de tout
-- faire, comme avant le compte.
--
-- L'anonymisation à 90 jours (retention.ts) remet aussi compte_id à null :
-- un dossier refermé ne désigne plus personne, ni par l'adresse ni par le
-- compte.
--
-- Tant que cette migration n'est pas passée, rien ne casse : les lecteurs
-- du compte replient en 42703 sur le rapprochement par email seul, et
-- l'épinglage se tait (patron CHAMPS_MAIL_REPLI, mails.ts).
alter table public.numeros
  add column if not exists compte_id uuid null references auth.users (id) on delete set null;
create index if not exists numeros_compte_id_idx
  on public.numeros (compte_id)
  where compte_id is not null;
