-- =====================================================
-- RLS: Permette ai clienti di leggere la propria assegnazione HPA
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- Permette al titolare/staff di un centro di vedere chi è il loro HPA
DROP POLICY IF EXISTS "Client can view own center assignment" ON hpa_centro_assignments;
CREATE POLICY "Client can view own center assignment" ON hpa_centro_assignments
  FOR SELECT TO authenticated
  USING (
    centro_id IN (
      SELECT up.centro_id FROM user_profiles up
      WHERE up.id = auth.uid() AND up.centro_id IS NOT NULL
    )
  );

SELECT 'Policy RLS aggiunta: clienti possono vedere la propria assegnazione HPA' AS status;
