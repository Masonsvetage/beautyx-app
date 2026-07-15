-- =====================================================
-- SETUP COMPLETO SISTEMA AUTENTICAZIONE
-- Esegui questo in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/xgdjlybiqizsmdacwiql/sql
-- =====================================================

-- 1. Aggiungi colonne mancanti a user_profiles (se esistono gia non fa nulla)
DO $$
BEGIN
    -- Aggiungi colonna ruolo se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'ruolo') THEN
        ALTER TABLE user_profiles ADD COLUMN ruolo VARCHAR(20) DEFAULT 'centro';
    END IF;

    -- Aggiungi colonna piano se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'piano') THEN
        ALTER TABLE user_profiles ADD COLUMN piano VARCHAR(20) DEFAULT 'demo';
    END IF;

    -- Aggiungi colonna attivo se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'attivo') THEN
        ALTER TABLE user_profiles ADD COLUMN attivo BOOLEAN DEFAULT TRUE;
    END IF;

    -- Aggiungi colonna centro_id se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'centro_id') THEN
        ALTER TABLE user_profiles ADD COLUMN centro_id UUID REFERENCES beauty_centers(id);
    END IF;

    -- Aggiungi colonna nome se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'nome') THEN
        ALTER TABLE user_profiles ADD COLUMN nome TEXT;
    END IF;

    -- Aggiungi colonna cognome se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user_profiles' AND column_name = 'cognome') THEN
        ALTER TABLE user_profiles ADD COLUMN cognome TEXT;
    END IF;
END $$;

-- 2. Tabella assegnazioni HPA -> Centri
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

-- 3. Indici
CREATE INDEX IF NOT EXISTS idx_user_profiles_ruolo ON user_profiles(ruolo);
CREATE INDEX IF NOT EXISTS idx_user_profiles_centro ON user_profiles(centro_id);
CREATE INDEX IF NOT EXISTS idx_hpa_assignments_hpa ON hpa_centro_assignments(hpa_id);
CREATE INDEX IF NOT EXISTS idx_hpa_assignments_centro ON hpa_centro_assignments(centro_id);

-- 4. RLS per hpa_centro_assignments
ALTER TABLE hpa_centro_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all assignments" ON hpa_centro_assignments;
CREATE POLICY "Admin can view all assignments" ON hpa_centro_assignments FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin'));

DROP POLICY IF EXISTS "HPA can view own assignments" ON hpa_centro_assignments;
CREATE POLICY "HPA can view own assignments" ON hpa_centro_assignments FOR SELECT
    USING (hpa_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage assignments" ON hpa_centro_assignments;
CREATE POLICY "Admin can manage assignments" ON hpa_centro_assignments FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin'));

-- 5. Funzione get_accessible_centros
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

-- 6. Trigger auto-creazione profilo
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

-- 7. INSERISCI ADMIN
INSERT INTO user_profiles (id, email, ruolo, piano, attivo, nome, cognome)
VALUES ('de45748d-86cb-4619-86a7-5d5bf97523d2', 'admin@beautyx.it', 'admin', 'pro', true, 'Admin', 'Beautyx')
ON CONFLICT (id) DO UPDATE SET
    ruolo = 'admin',
    piano = 'pro',
    attivo = true,
    nome = 'Admin',
    cognome = 'Beautyx';

-- 8. Verifica risultato
SELECT '=== ADMIN CREATO ===' as messaggio;
SELECT id, email, ruolo, piano, attivo FROM user_profiles WHERE ruolo = 'admin';

SELECT '=== TABELLE CREATE ===' as messaggio;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'hpa_centro_assignments');
