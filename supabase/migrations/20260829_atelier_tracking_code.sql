-- Le NUMÉRO de suivi, à côté du lien.
--
-- `tracking_url` ne peut accueillir qu'une adresse (elle est rendue en
-- <a href>, côté cliente comme côté atelier). Or Cloudprinter annonce
-- l'expédition avec un NUMÉRO dans la très grande majorité des cas
-- (« TEST123456789FR » à la recette du 26/08) : le webhook le jetait, faute
-- d'endroit où le mettre, et le colis se retrouvait sans suivi nulle part.
--
-- Depuis suivi.ts, le numéro est conservé ICI et transformé en adresse dans
-- `tracking_url` quand le transporteur est connu. Les deux vivent ensemble :
-- le lien pour cliquer, le numéro pour copier ailleurs (et pour les
-- transporteurs dont on ne connaît pas l'adresse de suivi).
alter table public.numeros
  add column if not exists tracking_code text null;
