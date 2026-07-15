-- =====================================================
-- MIGRAZIONE 009: Fix completo RLS per tutte le tabelle
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- 1. FUNZIONE HELPER is_admin (con bypass RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT ruolo_livello = 'admin' FROM user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- =====================================================
-- 2. FIX USER_PROFILES
-- =====================================================
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_select_all" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_update_all" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_delete" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Ogni utente vede il proprio profilo
CREATE POLICY "user_profiles_select_own"
ON user_profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR is_admin());

-- Ogni utente aggiorna il proprio profilo
CREATE POLICY "user_profiles_update_own"
ON user_profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR is_admin())
WITH CHECK (id = auth.uid() OR is_admin());

-- Solo admin inserisce
CREATE POLICY "user_profiles_insert"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() OR is_admin());

-- Solo admin elimina
CREATE POLICY "user_profiles_delete"
ON user_profiles FOR DELETE TO authenticated
USING (is_admin());

-- =====================================================
-- 3. FIX BEAUTY_CENTERS
-- =====================================================
DROP POLICY IF EXISTS "beauty_centers_select" ON beauty_centers;
DROP POLICY IF EXISTS "beauty_centers_insert" ON beauty_centers;
DROP POLICY IF EXISTS "beauty_centers_update" ON beauty_centers;
DROP POLICY IF EXISTS "beauty_centers_delete" ON beauty_centers;
DROP POLICY IF EXISTS "Users can read their center" ON beauty_centers;
DROP POLICY IF EXISTS "Admin full access" ON beauty_centers;

ALTER TABLE beauty_centers ENABLE ROW LEVEL SECURITY;

-- Tutti gli utenti autenticati possono leggere i centri (necessario per dropdown)
CREATE POLICY "beauty_centers_select"
ON beauty_centers FOR SELECT TO authenticated
USING (true);

-- Solo admin inserisce/modifica/elimina
CREATE POLICY "beauty_centers_insert"
ON beauty_centers FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "beauty_centers_update"
ON beauty_centers FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "beauty_centers_delete"
ON beauty_centers FOR DELETE TO authenticated
USING (is_admin());

-- =====================================================
-- 4. FIX HPA_CENTRO_ASSIGNMENTS (se esiste)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hpa_centro_assignments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "hpa_assignments_select" ON hpa_centro_assignments';
    EXECUTE 'ALTER TABLE hpa_centro_assignments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "hpa_assignments_select" ON hpa_centro_assignments FOR SELECT TO authenticated USING (hpa_id = auth.uid() OR is_admin())';
  END IF;
END $$;

-- =====================================================
-- 5. FIX ORGANIZATIONS (se esiste)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "organizations_select" ON organizations';
    EXECUTE 'ALTER TABLE organizations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

SELECT 'Migrazione 009 completata - RLS fixato per tutte le tabelle!' as status;
