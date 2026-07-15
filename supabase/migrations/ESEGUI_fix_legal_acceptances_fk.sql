-- =====================================================
-- Fix: sposta FK di legal_acceptances e legal_clause_acceptances
-- da user_profiles(id) → auth.users(id)
-- Motivo: un utente potrebbe non avere ancora un profilo
-- ma deve comunque poter accettare i documenti legali.
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. legal_acceptances
ALTER TABLE legal_acceptances
  DROP CONSTRAINT IF EXISTS legal_acceptances_user_id_fkey;

ALTER TABLE legal_acceptances
  ADD CONSTRAINT legal_acceptances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. legal_clause_acceptances
ALTER TABLE legal_clause_acceptances
  DROP CONSTRAINT IF EXISTS legal_clause_acceptances_user_id_fkey;

ALTER TABLE legal_clause_acceptances
  ADD CONSTRAINT legal_clause_acceptances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

SELECT 'FK legal_acceptances aggiornato a auth.users' AS status;
