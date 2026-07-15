-- =====================================================
-- MIGRAZIONE COMPLETA - ESEGUI TUTTO IN UN COLPO
-- Copia e incolla questo intero file su Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: RLS BEAUTY_CENTERS
-- =====================================================

ALTER TABLE beauty_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all centers" ON beauty_centers;
DROP POLICY IF EXISTS "Admin can manage all centers" ON beauty_centers;
DROP POLICY IF EXISTS "Users can view own center" ON beauty_centers;
DROP POLICY IF EXISTS "HPA can view assigned centers" ON beauty_centers;
DROP POLICY IF EXISTS "Allow insert centers" ON beauty_centers;

CREATE POLICY "Admin can view all centers" ON beauty_centers
FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin can manage all centers" ON beauty_centers
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view own center" ON beauty_centers
FOR SELECT USING (
  id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
);

CREATE POLICY "HPA can view assigned centers" ON beauty_centers
FOR SELECT USING (
  id IN (
    SELECT centro_id FROM hpa_centro_assignments
    WHERE hpa_id = auth.uid()
    AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
  )
);

CREATE POLICY "Allow insert centers" ON beauty_centers
FOR INSERT WITH CHECK (true);

-- =====================================================
-- PARTE 2: TABELLE MULTI-RUOLO E ORGANIZZAZIONI
-- =====================================================

-- Tabella Organizzazioni
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descrizione TEXT,
    logo_url TEXT,
    sede_principale_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id)
);

-- Collegamento Centri <-> Organizzazioni
CREATE TABLE IF NOT EXISTS centro_organization_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_sede_principale BOOLEAN DEFAULT FALSE,
    ordine INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(centro_id, organization_id)
);

-- FK per sede_principale
ALTER TABLE organizations
    DROP CONSTRAINT IF EXISTS organizations_sede_principale_fkey;
ALTER TABLE organizations
    ADD CONSTRAINT organizations_sede_principale_fkey
    FOREIGN KEY (sede_principale_id) REFERENCES beauty_centers(id) ON DELETE SET NULL;

-- Ruoli Utente (Multi-ruolo)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('admin', 'hpa', 'centro_owner', 'centro_staff')),
    centro_id UUID REFERENCES beauty_centers(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{}',
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    UNIQUE(user_id, role_type, centro_id)
);

-- Impostazioni Condivisione Dati
CREATE TABLE IF NOT EXISTS data_sharing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN (
        'movimenti_bancari', 'obiettivi', 'clienti', 'servizi',
        'listino', 'conversazioni_beautyx', 'analytics'
    )),
    sharing_mode TEXT NOT NULL CHECK (sharing_mode IN ('separated', 'shared', 'aggregated')) DEFAULT 'separated',
    visible_to_roles TEXT[] DEFAULT ARRAY['admin', 'hpa'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, data_type)
);

-- =====================================================
-- PARTE 3: INDICI
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_centro ON user_roles(centro_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_type ON user_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_centro_org_links_centro ON centro_organization_links(centro_id);
CREATE INDEX IF NOT EXISTS idx_centro_org_links_org ON centro_organization_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_sharing_org ON data_sharing_settings(organization_id);

-- =====================================================
-- PARTE 4: RLS PER NUOVE TABELLE
-- =====================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage organizations" ON organizations;
CREATE POLICY "Admin can manage organizations" ON organizations
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
FOR SELECT USING (
    id IN (
        SELECT col.organization_id
        FROM centro_organization_links col
        JOIN user_roles ur ON ur.centro_id = col.centro_id
        WHERE ur.user_id = auth.uid() AND ur.is_active = TRUE
    )
);

-- Centro Organization Links
ALTER TABLE centro_organization_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage links" ON centro_organization_links;
CREATE POLICY "Admin can manage links" ON centro_organization_links
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can view their centro links" ON centro_organization_links;
CREATE POLICY "Users can view their centro links" ON centro_organization_links
FOR SELECT USING (
    centro_id IN (
        SELECT centro_id FROM user_roles
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

-- User Roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all roles" ON user_roles;
CREATE POLICY "Admin can manage all roles" ON user_roles
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT USING (user_id = auth.uid());

-- Data Sharing Settings
ALTER TABLE data_sharing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage sharing settings" ON data_sharing_settings;
CREATE POLICY "Admin can manage sharing settings" ON data_sharing_settings
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can view their org settings" ON data_sharing_settings;
CREATE POLICY "Users can view their org settings" ON data_sharing_settings
FOR SELECT USING (
    organization_id IN (
        SELECT col.organization_id
        FROM centro_organization_links col
        JOIN user_roles ur ON ur.centro_id = col.centro_id
        WHERE ur.user_id = auth.uid() AND ur.is_active = TRUE
    )
);

-- =====================================================
-- PARTE 5: FUNZIONI HELPER
-- =====================================================

-- Ottieni tutti i ruoli di un utente
CREATE OR REPLACE FUNCTION get_user_roles_full(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    role_id UUID,
    role_type TEXT,
    centro_id UUID,
    centro_nome TEXT,
    organization_id UUID,
    organization_nome TEXT,
    permissions JSONB,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ur.id as role_id,
        ur.role_type,
        ur.centro_id,
        bc.nome as centro_nome,
        col.organization_id,
        o.nome as organization_nome,
        ur.permissions,
        ur.is_active
    FROM user_roles ur
    LEFT JOIN beauty_centers bc ON bc.id = ur.centro_id
    LEFT JOIN centro_organization_links col ON col.centro_id = ur.centro_id
    LEFT JOIN organizations o ON o.id = col.organization_id
    WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.valid_until IS NULL OR ur.valid_until >= CURRENT_DATE)
    ORDER BY
        CASE ur.role_type
            WHEN 'admin' THEN 1
            WHEN 'hpa' THEN 2
            WHEN 'centro_owner' THEN 3
            ELSE 4
        END,
        bc.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica se utente ha un ruolo specifico
CREATE OR REPLACE FUNCTION user_has_role(p_role_type TEXT, p_centro_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    has_role BOOLEAN;
BEGIN
    IF p_centro_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role_type = p_role_type
            AND is_active = TRUE
            AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
        ) INTO has_role;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role_type = p_role_type
            AND centro_id = p_centro_id
            AND is_active = TRUE
            AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
        ) INTO has_role;
    END IF;
    RETURN has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ottieni centri accessibili (versione 2 con organizzazioni)
CREATE OR REPLACE FUNCTION get_accessible_centros_v2()
RETURNS TABLE (
    centro_id UUID,
    nome_centro TEXT,
    role_type TEXT,
    organization_id UUID,
    organization_nome TEXT,
    is_sede_principale BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        bc.id as centro_id,
        bc.nome as nome_centro,
        ur.role_type,
        col.organization_id,
        o.nome as organization_nome,
        COALESCE(col.is_sede_principale, FALSE) as is_sede_principale
    FROM user_roles ur
    JOIN beauty_centers bc ON bc.id = ur.centro_id
    LEFT JOIN centro_organization_links col ON col.centro_id = bc.id
    LEFT JOIN organizations o ON o.id = col.organization_id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = TRUE
    AND (ur.valid_until IS NULL OR ur.valid_until >= CURRENT_DATE)

    UNION

    -- Admin vede tutti i centri
    SELECT
        bc.id,
        bc.nome,
        'admin'::TEXT,
        col.organization_id,
        o.nome,
        COALESCE(col.is_sede_principale, FALSE)
    FROM beauty_centers bc
    LEFT JOIN centro_organization_links col ON col.centro_id = bc.id
    LEFT JOIN organizations o ON o.id = col.organization_id
    WHERE EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role_type = 'admin'
        AND is_active = TRUE
    )

    ORDER BY nome_centro;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 6: MIGRAZIONE DATI ESISTENTI
-- =====================================================

-- Migra admin esistenti a user_roles
INSERT INTO user_roles (user_id, role_type, is_active)
SELECT id, 'admin', TRUE
FROM user_profiles
WHERE ruolo = 'admin'
ON CONFLICT (user_id, role_type, centro_id) DO NOTHING;

-- Migra HPA esistenti a user_roles
INSERT INTO user_roles (user_id, role_type, centro_id, permissions, is_active, valid_from, valid_until)
SELECT
    hca.hpa_id,
    'hpa',
    hca.centro_id,
    jsonb_build_object(
        'puo_creare_obiettivi', hca.puo_creare_obiettivi,
        'puo_pinnare_conversazioni', hca.puo_pinnare_conversazioni,
        'puo_vedere_movimenti', hca.puo_vedere_movimenti,
        'puo_modificare_budget', hca.puo_modificare_budget
    ),
    TRUE,
    hca.data_inizio,
    hca.data_fine
FROM hpa_centro_assignments hca
ON CONFLICT (user_id, role_type, centro_id) DO NOTHING;

-- Migra centro owners esistenti
INSERT INTO user_roles (user_id, role_type, centro_id, is_active)
SELECT id, 'centro_owner', centro_id, TRUE
FROM user_profiles
WHERE ruolo = 'centro' AND centro_id IS NOT NULL
ON CONFLICT (user_id, role_type, centro_id) DO NOTHING;

-- =====================================================
-- PARTE 7: VERIFICA
-- =====================================================

SELECT '=== MIGRAZIONE COMPLETATA ===' as info;

SELECT '--- Tabelle create ---' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'centro_organization_links', 'user_roles', 'data_sharing_settings');

SELECT '--- Ruoli migrati ---' as info;
SELECT role_type, COUNT(*) as count FROM user_roles GROUP BY role_type;

SELECT '--- Policies attive su beauty_centers ---' as info;
SELECT policyname FROM pg_policies WHERE tablename = 'beauty_centers';
