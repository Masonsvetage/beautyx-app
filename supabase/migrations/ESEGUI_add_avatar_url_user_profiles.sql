-- =====================================================
-- Aggiunge colonna avatar_url a user_profiles (per foto profilo HPA)
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN user_profiles.avatar_url IS 'URL foto profilo utente (usata per HPA nella chat)';

SELECT 'Colonna avatar_url aggiunta a user_profiles!' AS status;
