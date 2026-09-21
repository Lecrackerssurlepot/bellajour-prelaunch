-- Ce que la photo sait d'elle-même : quand, où, avec quoi, et à quoi elle
-- ressemble (T-123, 21/09/2026).
--
-- L'EXIF est déjà dans le coffre : `composer/depot/reduire.worker.js` le
-- regreffe sur chaque JPEG réduit, précisément « pour que l'atelier puisse
-- ordonner un numéro dans le temps ». Jusqu'ici rien ne le lisait. Ces
-- colonnes sont l'endroit où le serveur note ce qu'il a lu, une fois, après
-- la confirmation du lot (`/api/atelier/photos/complete`, en tâche de fond).
--
-- TOUT EST NULLABLE, et ce n'est pas une facilité : une capture d'écran n'a
-- pas de date, une photo scannée n'a pas de GPS, un fichier abîmé n'a rien.
-- `null` veut dire « on ne sait pas », jamais « zéro ».
--
-- `prise_le` est un timestamp SANS fuseau, volontairement : l'EXIF note
-- l'heure locale de l'appareil (« 2024:08:08 19:01:22 ») sans dire où il
-- était. La convertir en UTC inventerait un fuseau. Ce qu'on veut, c'est
-- l'ORDRE des photos d'un même dossier, et l'heure locale le donne.
--
-- `empreinte` est un pHash DCT 64 bits (16 hex), calculé sur la vignette :
-- deux photos à distance de Hamming ≤ 2 sont la même image ré-encodée.
--
-- `lieu_*` vient de Geoapify (une requête par GROUPE de photos, jamais par
-- photo) ; `lieu_le` note qu'on a demandé, résultat ou pas, pour ne pas
-- redemander à chaque passage. `metadonnees_le` joue le même rôle pour la
-- lecture EXIF : c'est LE marqueur d'idempotence du rattrapage.
--
-- Code de lecture ET d'écriture avec repli (42703 / PGRST204) : entre le
-- déploiement et ce fichier, la fiche s'affiche sans ces informations, et
-- la confirmation d'une photo n'échoue jamais pour elles.
alter table public.photos
  add column if not exists largeur        integer null,
  add column if not exists hauteur        integer null,
  add column if not exists prise_le       timestamp without time zone null,
  add column if not exists appareil       text null,
  add column if not exists gps_lat        double precision null,
  add column if not exists gps_lon        double precision null,
  add column if not exists empreinte      text null,
  add column if not exists luminance      real null,
  add column if not exists metadonnees_le timestamptz null,
  add column if not exists lieu_ville     text null,
  add column if not exists lieu_pays      text null,
  add column if not exists lieu_code_pays text null,
  add column if not exists lieu_le        timestamptz null;

-- Le rattrapage cherche « les photos confirmées sans métadonnées » : sur
-- quelques milliers de lignes l'index est un confort, pas une nécessité.
create index if not exists photos_metadonnees_le_idx
  on public.photos (metadonnees_le) where metadonnees_le is null;
