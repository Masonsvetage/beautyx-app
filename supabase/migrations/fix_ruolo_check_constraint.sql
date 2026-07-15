-- =====================================================
-- FIX: Check constraint su user_profiles.ruolo
-- Il constraint attuale accetta solo ('admin', 'hpa')
-- ma serve anche 'centro' per gli utenti normali
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- Rimuovi il constraint esistente
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_ruolo_check;

-- Ricrea con tutti i valori validi
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_ruolo_check
  CHECK (ruolo IN ('centro', 'hpa', 'admin'));

-- Aggiorna eventuali profili con ruolo non valido
UPDATE user_profiles SET ruolo = 'centro' WHERE ruolo NOT IN ('centro', 'hpa', 'admin') AND ruolo_livello IN ('titolare', 'direttore', 'amministrativo');
