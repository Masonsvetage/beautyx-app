-- =====================================================
-- STEP 5: Aggiungi colonna ruolo_livello a user_profiles
-- Esegui DOPO lo STEP 4
-- =====================================================

-- Colonna per il nuovo sistema gerarchico di ruoli
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ruolo_livello VARCHAR(30);

-- Aggiorna i valori esistenti basandosi sul ruolo legacy
UPDATE user_profiles
SET ruolo_livello = CASE
  WHEN ruolo = 'admin' THEN 'admin'
  WHEN ruolo = 'hpa' THEN 'hpa'
  ELSE 'titolare'
END
WHERE ruolo_livello IS NULL;

-- Indice per query su ruolo_livello
CREATE INDEX IF NOT EXISTS idx_user_profiles_ruolo_livello ON user_profiles(ruolo_livello);

-- Verifica
SELECT 'Colonna ruolo_livello aggiunta e popolata!' as status;
