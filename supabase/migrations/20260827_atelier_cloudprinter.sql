-- Cloudprinter (PRD §13 phase 2) : le fichier d'impression et la commande.
-- APPLIQUÉE en production le 26/08/2026 (MCP Supabase, sur accord de Mathias).
--
-- `impression_fichiers` porte les clés R2 des PDF print-ready déposés depuis
-- la fiche admin : { "product": "..." } pour l'agrafé,
-- { "cover": "...", "book": "..." } pour le dos carré.
-- jsonb et non des colonnes text : les fichiers requis dépendent du produit.
-- Distinct de `maquette_pdf_url` (le feuilletable montré à la cliente).
alter table public.numeros add column if not exists impression_fichiers jsonb;

-- Le webhook CloudSignal retrouve un dossier par sa référence (= id, la PK)
-- ou par l'identifiant de commande Cloudprinter, selon ce que porte le
-- payload. L'index partiel couvre le second chemin.
create index if not exists numeros_cloudprinter_order_idx
  on public.numeros (cloudprinter_order_id)
  where cloudprinter_order_id is not null;
