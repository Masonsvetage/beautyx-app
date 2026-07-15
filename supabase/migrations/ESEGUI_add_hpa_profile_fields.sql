-- =====================================================
-- Aggiunge campi profilo per HPA (bio, specializzazione)
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS specializzazione TEXT;

-- Commenti
COMMENT ON COLUMN user_profiles.bio IS 'Breve descrizione del consulente HPA';
COMMENT ON COLUMN user_profiles.specializzazione IS 'Area di specializzazione (es. Revenue Management, Marketing, HR)';

SELECT 'Campi bio e specializzazione aggiunti a user_profiles!' AS status;
