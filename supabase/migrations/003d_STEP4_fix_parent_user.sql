-- =====================================================
-- STEP 4: Aggiungi colonna parent_user_id mancante
-- Esegui DOPO lo STEP 3
-- =====================================================

-- Colonna per collegare utenti secondari all'utente principale (multi-profilo)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_user_id UUID;

-- Indice per trovare velocemente i profili collegati
CREATE INDEX IF NOT EXISTS idx_user_profiles_parent ON user_profiles(parent_user_id);

-- Verifica
SELECT 'Colonna parent_user_id aggiunta!' as status;
