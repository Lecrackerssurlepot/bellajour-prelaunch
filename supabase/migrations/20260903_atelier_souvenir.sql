-- Le PDF souvenir — le magazine numérique offert à la livraison (03/09).
--
-- À la commande d'impression, l'atelier fusionne les PDF déposés (agrafé :
-- le `product` seul ; dos carré : 1re de couverture + bloc + 4e de
-- couverture, découpées de la feuille enveloppante) en UN fichier lisible,
-- rangé au coffre R2 sous `numeros/<id>/souvenir/`. À la livraison
-- (signal Cloudprinter ItemDeliveryCompleted, ou geste manuel), le mail
-- M7b porte le lien de téléchargement.
--
-- `souvenir_pdf_key` : la clé R2 du fichier, jamais une URL (le coffre est
-- privé, la route /api/atelier/souvenir re-signe à chaque clic).
-- `souvenir_pdf_octets` : le poids, affiché à côté du bouton — la fusion ne
-- recompresse pas les images, le fichier garde le poids d'impression, et un
-- client en 4G doit le savoir avant de cliquer.
--
-- Tant que cette migration n'est pas passée, rien ne casse : la génération
-- crie en 42703, M7b se signale « incomplet » et attend (CHAMPS_MAIL_REPLI,
-- mails.ts).
alter table public.numeros
  add column if not exists souvenir_pdf_key text null;
alter table public.numeros
  add column if not exists souvenir_pdf_octets bigint null;
