-- =====================================================
-- STEP 3: Crea tabella user_roles e funzioni
-- Esegui DOPO lo STEP 2
-- =====================================================

-- Tabella user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_type VARCHAR(30) NOT NULL,
  centro_id UUID,
  organization_id UUID,
  permissions JSONB DEFAULT '{}',
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active);

-- Tabella abbonamenti
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  piano VARCHAR(30) DEFAULT 'enterprise',
  sedi_incluse INTEGER DEFAULT 2,
  costo_sede_extra DECIMAL(10,2) DEFAULT 0,
  costo_mensile DECIMAL(10,2),
  costo_annuale DECIMAL(10,2),
  stato VARCHAR(20) DEFAULT 'attivo',
  data_inizio DATE DEFAULT CURRENT_DATE,
  data_scadenza DATE,
  max_utenti INTEGER,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funzione: Ottieni ruoli utente
CREATE OR REPLACE FUNCTION get_user_all_roles(p_user_id UUID)
RETURNS TABLE (
  role_id UUID,
  role_type VARCHAR(30),
  centro_id UUID,
  centro_nome TEXT,
  organization_id UUID,
  organization_nome TEXT,
  is_primary BOOLEAN,
  is_active BOOLEAN,
  valid_from DATE,
  valid_until DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.id as role_id,
    ur.role_type,
    ur.centro_id,
    bc.nome as centro_nome,
    ur.organization_id,
    o.nome as organization_nome,
    ur.is_primary,
    ur.is_active,
    ur.valid_from,
    ur.valid_until
  FROM user_roles ur
  LEFT JOIN beauty_centers bc ON bc.id = ur.centro_id
  LEFT JOIN organizations o ON o.id = ur.organization_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND (ur.valid_until IS NULL OR ur.valid_until >= CURRENT_DATE)
  ORDER BY ur.is_primary DESC, ur.created_at;
END;
$$;

-- Funzione: Aggiungi ruolo
CREATE OR REPLACE FUNCTION add_user_role(
  p_user_id UUID,
  p_role_type VARCHAR(30),
  p_centro_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_role_id UUID;
BEGIN
  IF p_is_primary THEN
    UPDATE user_roles SET is_primary = FALSE WHERE user_id = p_user_id;
  END IF;

  INSERT INTO user_roles (user_id, role_type, centro_id, organization_id, is_primary)
  VALUES (p_user_id, p_role_type, p_centro_id, p_organization_id, p_is_primary)
  RETURNING id INTO v_new_role_id;

  RETURN v_new_role_id;
END;
$$;

-- Funzione: Switch ruolo
CREATE OR REPLACE FUNCTION switch_user_role(p_user_id UUID, p_role_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE id = p_role_id AND user_id = p_user_id) THEN
    RETURN FALSE;
  END IF;

  UPDATE user_roles SET is_primary = FALSE WHERE user_id = p_user_id;
  UPDATE user_roles SET is_primary = TRUE WHERE id = p_role_id;

  RETURN TRUE;
END;
$$;

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own roles" ON user_roles;
CREATE POLICY "Users view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin manage roles" ON user_roles;
CREATE POLICY "Admin manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo = 'admin')
  );

-- Verifica
SELECT 'User roles e funzioni create!' as status;
