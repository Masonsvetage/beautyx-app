-- ============================================
-- ADMIN PASSWORD RESET + CAMBIO PASSWORD OBBLIGATORIO
-- Eseguire in Supabase Dashboard SQL Editor
-- ============================================

-- Aggiunge colonna per forzare cambio password al prossimo login
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS deve_cambiare_password BOOLEAN DEFAULT FALSE;

-- Commento per documentazione
COMMENT ON COLUMN user_profiles.deve_cambiare_password IS 'Se true, l utente deve cambiare la password provvisoria al prossimo login';
