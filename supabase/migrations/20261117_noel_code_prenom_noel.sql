-- Noël 2026, 17/11 : le code de la carte devient PRÉNOM-NOEL-1234 (Mathias, 16/11 :
-- « prénom-noël et après un numéro facile »). Remplace la forme CAMILLE-XXXXXX de
-- 20261117_noel_codes_et_mails.sql, qui n'a servi à aucune carte. BJ-CADEAU-XXXXXX
-- (les premières cartes de test) reste acceptée.

alter table public.cartes_cadeau drop constraint if exists cartes_cadeau_code_check;
alter table public.cartes_cadeau add constraint cartes_cadeau_code_check
  check (code ~ '^([A-Z]{2,12}-NOEL-[1-9][0-9]{3}|BJ-CADEAU-[A-HJKMNP-Z2-9]{6})$');
