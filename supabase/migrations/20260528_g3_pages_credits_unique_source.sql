-- ════════════════════════════════════════════════════════════════
-- G3 — UNIQUE(source) sur pages_credits
--
-- À VALIDER ET ROULER PAR JOSEPH — ne pas appliquer en aveugle.
--
-- Garantit qu'un même filleul (identifié par son ref_code, stocké dans
-- pages_credits.source) ne peut pas créditer son parrain plus d'une fois,
-- quel que soit l'état applicatif (race condition, retry, replay POST).
--
-- L'API utilise désormais upsert(onConflict='source', ignoreDuplicates=true)
-- pour rester idempotente sans dépendre uniquement de la contrainte DB.
--
-- Ordre d'exécution :
--   1. Vérifier les doublons existants AVANT de créer l'index :
--        SELECT source, COUNT(*) FROM pages_credits
--        GROUP BY source HAVING COUNT(*) > 1;
--      → Traiter à la main si besoin (garder la plus ancienne, supprimer les autres).
--   2. CREATE UNIQUE INDEX.
-- ════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS pages_credits_source_uidx
  ON pages_credits (source);
