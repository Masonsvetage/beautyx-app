-- =====================================================
-- FIX RLS POLICIES - RISOLVE RICORSIONE INFINITA
-- Esegui questo in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Rimuovi tutte le policy esistenti su user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "HPA can view assigned centro profiles" ON user_profiles;

-- 2. Abilita RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy SEMPLICE: ogni utente può leggere il proprio profilo
-- (non causa ricorsione perché usa solo auth.uid())
CREATE POLICY "Users can read own profile" ON user_profiles
FOR SELECT USING (id = auth.uid());

-- 4. Policy: ogni utente può aggiornare il proprio profilo
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (id = auth.uid());

-- 5. Funzione SECURITY DEFINER per verificare ruolo (bypassa RLS)
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT ruolo INTO user_role FROM user_profiles WHERE id = user_id;
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Policy per admin: può vedere tutti i profili
-- Usa la funzione SECURITY DEFINER per evitare ricorsione
CREATE POLICY "Admin can view all profiles" ON user_profiles
FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- 7. Policy per admin: può modificare tutti i profili
CREATE POLICY "Admin can manage all profiles" ON user_profiles
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- 8. Policy per inserimento profili (trigger on_auth_user_created)
CREATE POLICY "Service can insert profiles" ON user_profiles
FOR INSERT WITH CHECK (true);

-- Verifica
SELECT 'Policies aggiornate con successo!' as messaggio;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles';
