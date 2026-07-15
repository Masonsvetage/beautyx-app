-- =====================================================
-- RLS POLICIES PER USER_PROFILES
-- Esegui questo in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Abilita RLS su user_profiles (se non già abilitato)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policy: utenti possono leggere il proprio profilo
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT
    USING (id = auth.uid());

-- 3. Policy: utenti possono aggiornare il proprio profilo
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- 4. Policy: admin può vedere tutti i profili
DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
CREATE POLICY "Admin can view all profiles" ON user_profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin'));

-- 5. Policy: admin può modificare tutti i profili
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
CREATE POLICY "Admin can manage all profiles" ON user_profiles FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin'));

-- 6. Policy: HPA può vedere profili dei centri assegnati
DROP POLICY IF EXISTS "HPA can view assigned centro profiles" ON user_profiles;
CREATE POLICY "HPA can view assigned centro profiles" ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() AND up.ruolo = 'hpa'
        )
        AND (
            centro_id IN (
                SELECT centro_id FROM hpa_centro_assignments
                WHERE hpa_id = auth.uid()
                AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
            )
        )
    );

-- Verifica
SELECT 'RLS policies create per user_profiles' as messaggio;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles';
