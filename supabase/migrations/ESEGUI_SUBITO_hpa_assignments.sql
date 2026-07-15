-- =====================================================
-- MIGRAZIONE HPA ASSIGNMENTS + FUNZIONI + ADMIN
-- Esegui questo in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Tabella assegnazioni HPA -> Centri
CREATE TABLE IF NOT EXISTS hpa_centro_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hpa_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
    puo_creare_obiettivi BOOLEAN DEFAULT TRUE,
    puo_pinnare_conversazioni BOOLEAN DEFAULT TRUE,
    puo_vedere_movimenti BOOLEAN DEFAULT TRUE,
    puo_modificare_budget BOOLEAN DEFAULT FALSE,
    data_inizio DATE DEFAULT CURRENT_DATE,
    data_fine DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    UNIQUE(hpa_id, centro_id)
);

-- 2. Indici
CREATE INDEX IF NOT EXISTS idx_hpa_assignments_hpa ON hpa_centro_assignments(hpa_id);
CREATE INDEX IF NOT EXISTS idx_hpa_assignments_centro ON hpa_centro_assignments(centro_id);

-- 3. Abilita RLS
ALTER TABLE hpa_centro_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Policies per hpa_centro_assignments
DROP POLICY IF EXISTS "Admin can view all assignments" ON hpa_centro_assignments;
CREATE POLICY "Admin can view all assignments" ON hpa_centro_assignments FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin'));

DROP POLICY IF EXISTS "HPA can view own assignments" ON hpa_centro_assignments;
CREATE POLICY "HPA can view own assignments" ON hpa_centro_assignments FOR SELECT
    USING (hpa_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage assignments" ON hpa_centro_assignments;
CREATE POLICY "Admin can manage assignments" ON hpa_centro_assignments FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin'));

-- 5. Funzione per ottenere centri accessibili
CREATE OR REPLACE FUNCTION get_accessible_centros()
RETURNS TABLE (centro_id UUID, nome_centro TEXT, accesso_tipo TEXT) AS $$
DECLARE
    current_role TEXT;
    current_centro UUID;
BEGIN
    SELECT ruolo, user_profiles.centro_id INTO current_role, current_centro
    FROM user_profiles WHERE id = auth.uid();

    IF current_role = 'admin' THEN
        RETURN QUERY SELECT bc.id, bc.nome, 'admin'::TEXT
        FROM beauty_centers bc ORDER BY bc.nome;
    ELSIF current_role = 'hpa' THEN
        RETURN QUERY SELECT bc.id, bc.nome, 'hpa'::TEXT
        FROM beauty_centers bc
        JOIN hpa_centro_assignments hca ON hca.centro_id = bc.id
        WHERE hca.hpa_id = auth.uid()
        AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
        ORDER BY bc.nome;
    ELSIF current_role = 'centro' AND current_centro IS NOT NULL THEN
        RETURN QUERY SELECT bc.id, bc.nome, 'owner'::TEXT
        FROM beauty_centers bc WHERE bc.id = current_centro;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger auto-creazione profilo su signup (se non esiste)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, ruolo, piano, attivo)
    VALUES (NEW.id, NEW.email, 'centro', 'demo', TRUE)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 7. CREA PROFILO ADMIN
INSERT INTO user_profiles (id, email, ruolo, piano, attivo, nome, cognome)
VALUES ('de45748d-86cb-4619-86a7-5d5bf97523d2', 'admin@beautyx.it', 'admin', 'pro', true, 'Admin', 'Beautyx')
ON CONFLICT (id) DO UPDATE SET ruolo = 'admin', piano = 'pro', attivo = true;

-- Verifica
SELECT id, email, ruolo, piano FROM user_profiles WHERE ruolo = 'admin';
