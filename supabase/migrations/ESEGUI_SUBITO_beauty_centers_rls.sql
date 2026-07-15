-- =====================================================
-- RLS POLICIES PER BEAUTY_CENTERS
-- Esegui questo in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Abilita RLS su beauty_centers
ALTER TABLE beauty_centers ENABLE ROW LEVEL SECURITY;

-- 2. Rimuovi policy esistenti
DROP POLICY IF EXISTS "Admin can view all centers" ON beauty_centers;
DROP POLICY IF EXISTS "Admin can manage all centers" ON beauty_centers;
DROP POLICY IF EXISTS "Users can view own center" ON beauty_centers;
DROP POLICY IF EXISTS "HPA can view assigned centers" ON beauty_centers;

-- 3. Admin può vedere tutti i centri
CREATE POLICY "Admin can view all centers" ON beauty_centers
FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- 4. Admin può gestire tutti i centri
CREATE POLICY "Admin can manage all centers" ON beauty_centers
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- 5. Utenti possono vedere il proprio centro
CREATE POLICY "Users can view own center" ON beauty_centers
FOR SELECT USING (
  id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
);

-- 6. HPA può vedere i centri assegnati
CREATE POLICY "HPA can view assigned centers" ON beauty_centers
FOR SELECT USING (
  id IN (
    SELECT centro_id FROM hpa_centro_assignments
    WHERE hpa_id = auth.uid()
    AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
  )
);

-- 7. Permetti inserimento centri (per registrazione)
CREATE POLICY "Allow insert centers" ON beauty_centers
FOR INSERT WITH CHECK (true);

-- Verifica
SELECT 'Policies create per beauty_centers' as messaggio;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'beauty_centers';
