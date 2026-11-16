-- Noël 2026, 17/11 : deux contraintes de 20261116_noel_cartes_cadeau.sql à élargir.
--
-- 1. Le code porte le prénom de la personne qui reçoit la carte (Mathias,
--    16/11) : CAMILLE-7KQ4MR. BJ-CADEAU-7KQ4MR reste valable (cartes déjà
--    tirées, prénoms sans deux lettres lisibles).
-- 2. Les mails ajoutés après la première migration (GC4b, GC6, GC7) étaient
--    REFUSÉS par la contrainte de cartes_mails : le verrou ne se posait pas,
--    le mail ne partait jamais. GC3 reste permis (lignes anciennes possibles).
--
-- Idempotente : on retire avant de reposer.

alter table public.cartes_cadeau drop constraint if exists cartes_cadeau_code_check;
alter table public.cartes_cadeau add constraint cartes_cadeau_code_check
  check (code ~ '^(BJ-CADEAU|[A-Z]{2,12})-[A-HJKMNP-Z2-9]{6}$');

alter table public.cartes_mails drop constraint if exists cartes_mails_code_check;
alter table public.cartes_mails add constraint cartes_mails_code_check
  check (code in ('GC1', 'GC1b', 'GC2', 'GC2b', 'GC3', 'GC4', 'GC4b', 'GC5', 'GC6', 'GC7'));
