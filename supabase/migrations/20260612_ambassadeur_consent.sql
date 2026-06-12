-- Cercle Ambassadeur — preuve d'acceptation de la charte (qui + quand + quelle version).
-- Ajoute deux colonnes nullables sur waitlist. N'altère aucune colonne existante.
-- is_ambassadeur (bool default false) existe déjà → ne pas recréer.
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS ambassadeur_consent_at     timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ambassadeur_charte_version text        NULL;
