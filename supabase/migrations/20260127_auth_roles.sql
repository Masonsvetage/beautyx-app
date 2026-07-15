-- =====================================================
-- SISTEMA AUTENTICAZIONE CON RUOLI
-- Centro, HPA (professionista), Admin
-- =====================================================

-- 1. Tabella profili utente
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT,
    cognome TEXT,
    ruolo VARCHAR(20) DEFAULT 'centro' CHECK (ruolo IN ('centro', 'hpa', 'admin')),
    centro_id UUID REFERENCES beauty_centers(id) ON DELETE SET NULL,
    piano VARCHAR(20) DEFAULT 'demo' CHECK (piano IN ('demo', 'base', 'pro')),
    attivo BOOLEAN DEFAULT TRUE,
    telefono TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 3. Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_ruolo ON user_profiles(ruolo);
CREATE INDEX IF NOT EXISTS idx_user_profiles_centro ON user_profiles(centro_id);
CREATE INDEX IF NOT EXISTS idx_hpa_assignments_hpa ON hpa_centro_assignments(hpa_id);
CREATE INDEX IF NOT EXISTS idx_hpa_assignments_centro ON hpa_centro_assignments(centro_id);

-- 4. Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 5. Trigger per auto-creare profilo su signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, ruolo, piano, attivo)
    VALUES (
        NEW.id,
        NEW.email,
        'centro',  -- Default: ruolo centro
        'demo',    -- Default: piano demo gratuito
        TRUE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rimuovi trigger esistente se presente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crea trigger su auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 6. RLS Policies per user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: ogni utente vede solo il proprio profilo
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy: admin può vedere tutti i profili
CREATE POLICY "Admin can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy: HPA può vedere profili dei centri assegnati
CREATE POLICY "HPA can view assigned centro profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hpa_centro_assignments hca
            JOIN user_profiles up ON up.id = auth.uid()
            WHERE up.ruolo = 'hpa'
            AND hca.hpa_id = auth.uid()
            AND hca.centro_id = user_profiles.centro_id
        )
    );

-- Policy: utente può aggiornare il proprio profilo (campi limitati)
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: admin può aggiornare tutti i profili
CREATE POLICY "Admin can update all profiles"
    ON user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy: admin può inserire nuovi profili (per creare HPA)
CREATE POLICY "Admin can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- 7. RLS Policies per hpa_centro_assignments
ALTER TABLE hpa_centro_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: admin può vedere tutte le assegnazioni
CREATE POLICY "Admin can view all assignments"
    ON hpa_centro_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy: HPA può vedere le proprie assegnazioni
CREATE POLICY "HPA can view own assignments"
    ON hpa_centro_assignments FOR SELECT
    USING (hpa_id = auth.uid());

-- Policy: Centro può vedere HPA assegnati
CREATE POLICY "Centro can view assigned HPA"
    ON hpa_centro_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND ruolo = 'centro'
            AND centro_id = hpa_centro_assignments.centro_id
        )
    );

-- Policy: solo admin può creare assegnazioni
CREATE POLICY "Admin can create assignments"
    ON hpa_centro_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy: solo admin può modificare assegnazioni
CREATE POLICY "Admin can update assignments"
    ON hpa_centro_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy: solo admin può eliminare assegnazioni
CREATE POLICY "Admin can delete assignments"
    ON hpa_centro_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- 8. Funzione helper per ottenere ruolo utente corrente
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT ruolo INTO user_role
    FROM user_profiles
    WHERE id = auth.uid();

    RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Funzione helper per verificare se HPA ha accesso a un centro
CREATE OR REPLACE FUNCTION hpa_has_centro_access(p_centro_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM hpa_centro_assignments
        WHERE hpa_id = auth.uid()
        AND centro_id = p_centro_id
        AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Funzione per ottenere centri accessibili dall'utente corrente
CREATE OR REPLACE FUNCTION get_accessible_centros()
RETURNS TABLE (
    centro_id UUID,
    nome_centro TEXT,
    accesso_tipo TEXT
) AS $$
DECLARE
    current_role TEXT;
    current_centro UUID;
BEGIN
    SELECT ruolo, user_profiles.centro_id INTO current_role, current_centro
    FROM user_profiles
    WHERE id = auth.uid();

    IF current_role = 'admin' THEN
        -- Admin vede tutti i centri
        RETURN QUERY
        SELECT bc.id, bc.nome, 'admin'::TEXT
        FROM beauty_centers bc
        ORDER BY bc.nome;
    ELSIF current_role = 'hpa' THEN
        -- HPA vede solo centri assegnati
        RETURN QUERY
        SELECT bc.id, bc.nome, 'hpa'::TEXT
        FROM beauty_centers bc
        JOIN hpa_centro_assignments hca ON hca.centro_id = bc.id
        WHERE hca.hpa_id = auth.uid()
        AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
        ORDER BY bc.nome;
    ELSIF current_role = 'centro' AND current_centro IS NOT NULL THEN
        -- Centro vede solo il proprio
        RETURN QUERY
        SELECT bc.id, bc.nome, 'owner'::TEXT
        FROM beauty_centers bc
        WHERE bc.id = current_centro;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Commenti per documentazione
COMMENT ON TABLE user_profiles IS 'Profili utente con ruoli: centro (proprietario), hpa (consulente), admin';
COMMENT ON TABLE hpa_centro_assignments IS 'Assegnazioni HPA a centri con permessi specifici';
COMMENT ON COLUMN user_profiles.ruolo IS 'centro = proprietario, hpa = consulente professionista, admin = amministratore';
COMMENT ON COLUMN user_profiles.piano IS 'demo = gratuito limitato, base = pagamento, pro = completo';
COMMENT ON FUNCTION get_accessible_centros() IS 'Restituisce lista centri accessibili per utente corrente';
