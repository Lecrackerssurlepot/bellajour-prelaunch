-- ════════════════════════════════════════════════════════════════
-- G1 — Email canonical anti-alias (Gmail dots + tags)
--
-- À VALIDER ET ROULER PAR JOSEPH — ne pas appliquer en aveugle.
--
-- Cette migration ajoute une colonne `email_canonical` sur `waitlist`,
-- maintenue côté API (route.ts) via la fonction canonicalizeEmail().
-- L'index UNIQUE garantit qu'on ne peut plus créer N filleuls "distincts"
-- à partir d'une même boîte Gmail (jane+1@gmail.com, j.ane@gmail.com, etc.).
--
-- Ordre d'exécution :
--   1. ADD COLUMN (nullable, sans contrainte) — sans risque.
--   2. BACKFILL des lignes existantes (voir bloc commenté ci-dessous).
--      → Joseph doit calculer la canonical form pour chaque ligne existante
--        AVANT de créer l'index UNIQUE, sinon des doublons existants feraient
--        échouer la création de l'index.
--      → Si des doublons sont détectés au backfill : décider quelle ligne garder
--        (la plus ancienne par défaut) et supprimer/merger les autres À LA MAIN.
--   3. CREATE UNIQUE INDEX.
--
-- L'email d'origine (`email`) reste la valeur d'affichage et celle envoyée à Brevo.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS email_canonical TEXT;

-- ── BACKFILL (à exécuter manuellement par Joseph) ──
-- Pour chaque ligne existante, calculer la canonical form selon la même règle que
-- src/lib/email.ts : @gmail.com / @googlemail.com → strip dots + tronque "+",
-- domaine unifié vers gmail.com. Hors Gmail : email tel quel (lowercase+trim).
--
-- Option SQL pure (à valider avant de rouler) :
--
-- UPDATE waitlist
-- SET email_canonical = CASE
--   WHEN split_part(lower(email), '@', 2) IN ('gmail.com', 'googlemail.com')
--     THEN replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '') || '@gmail.com'
--   ELSE lower(trim(email))
-- END
-- WHERE email_canonical IS NULL;
--
-- AVANT de créer l'index UNIQUE ci-dessous, vérifier les doublons :
--   SELECT email_canonical, COUNT(*) FROM waitlist
--   GROUP BY email_canonical HAVING COUNT(*) > 1;
-- → Traiter les doublons à la main (garder la plus ancienne ligne, supprimer/merger).

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_canonical_uidx
  ON waitlist (email_canonical);
