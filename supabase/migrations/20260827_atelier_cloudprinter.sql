-- Cloudprinter (PRD §13 phase 2) : le fichier d'impression et la commande.
--
-- `impression_fichiers` porte la clé R2 du PDF print-ready déposé depuis la
-- fiche admin : { "produit": "numeros/<id>/impression/produit-<suffixe>.pdf" }.
-- jsonb et non une colonne text : le jour où un produit exige un second
-- fichier (couverture séparée), on ajoute une clé, pas une migration.
-- Distinct de `maquette_pdf_url` (le feuilletable montré à la cliente).
alter table public.numeros add column if not exists impression_fichiers jsonb;

-- Le webhook CloudSignal retrouve un dossier par sa référence (= id, la PK)
-- ou par l'identifiant de commande Cloudprinter, selon ce que porte le
-- payload. L'index partiel couvre le second chemin.
create index if not exists numeros_cloudprinter_order_idx
  on public.numeros (cloudprinter_order_id)
  where cloudprinter_order_id is not null;
