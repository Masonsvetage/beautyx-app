-- =====================================================
-- MIGRAZIONE 008: Fix policy RLS (evita loop infinito)
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- Rimuovi le policy problematiche
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can do everything on profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Abilita RLS sulla tabella (se non già abilitato)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy semplice: ogni utente può vedere e modificare il proprio profilo
CREATE POLICY "user_profiles_select_own"
ON user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "user_profiles_update_own"
ON user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Per gli admin, usiamo una funzione SECURITY DEFINER per evitare il loop
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND ruolo_livello = 'admin'
  );
$$;

-- Policy per admin: possono vedere tutti
CREATE POLICY "user_profiles_admin_select_all"
ON user_profiles
FOR SELECT
TO authenticated
USING (is_admin());

-- Policy per admin: possono modificare tutti
CREATE POLICY "user_profiles_admin_update_all"
ON user_profiles
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Policy per admin: possono inserire
CREATE POLICY "user_profiles_admin_insert"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (is_admin() OR id = auth.uid());

-- Policy per admin: possono eliminare
CREATE POLICY "user_profiles_admin_delete"
ON user_profiles
FOR DELETE
TO authenticated
USING (is_admin());

SELECT 'Migrazione 008 completata - Policy RLS fixate!' as status;
