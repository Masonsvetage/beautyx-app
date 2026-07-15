-- =====================================================
-- MIGRAZIONE: Estensione user_profiles con anagrafica completa
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Assicurati che la tabella organizations esista
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descrizione TEXT,
    logo_url TEXT,
    sede_principale_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- =====================================================
-- STEP 2: Aggiungi campi anagrafici a user_profiles
-- =====================================================

-- Dati anagrafici base
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS data_nascita DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS luogo_nascita VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS codice_fiscale VARCHAR(16);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS partita_iva VARCHAR(11);

-- Recapiti
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telefono_fisso VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cellulare VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pec VARCHAR(255);

-- Residenza
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_nazione VARCHAR(50) DEFAULT 'Italia';

-- Domicilio (se diverso da residenza)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_diverso BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_nazione VARCHAR(50) DEFAULT 'Italia';

-- Documento d'identità
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_tipo VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_numero VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_rilasciato_da VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_rilascio DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_scadenza DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_scan_fronte_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_scan_retro_url TEXT;

-- Informazioni professionali
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS professione VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS azienda VARCHAR(150);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sito_web VARCHAR(255);

-- Note e metadata
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS note_interne TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Collegamento a organizzazione (senza FK per evitare errori di dipendenza)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;

-- =====================================================
-- STEP 3: Tabella user_roles per multi-profilo
-- =====================================================
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
CREATE INDEX IF NOT EXISTS idx_user_roles_centro_id ON user_roles(centro_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(user_id, is_active);

-- =====================================================
-- STEP 4: Tabella abbonamenti organizzazioni
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  piano VARCHAR(30) NOT NULL DEFAULT 'enterprise',
  sedi_incluse INTEGER NOT NULL DEFAULT 2,
  costo_sede_extra DECIMAL(10,2) DEFAULT 0,
  costo_mensile DECIMAL(10,2),
  costo_annuale DECIMAL(10,2),
  frequenza_pagamento VARCHAR(20) DEFAULT 'mensile',
  stato VARCHAR(20) DEFAULT 'attivo',
  data_inizio DATE DEFAULT CURRENT_DATE,
  data_scadenza DATE,
  trial_ends_at TIMESTAMPTZ,
  max_utenti INTEGER,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 5: Funzioni helper
-- =====================================================

-- Funzione: Ottieni tutti i ruoli di un utente
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

-- Funzione: Aggiungi ruolo a utente
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
  v_has_primary BOOLEAN;
BEGIN
  -- Se è primary, rimuovi primary dagli altri ruoli
  IF p_is_primary THEN
    UPDATE user_roles
    SET is_primary = FALSE, updated_at = NOW()
    WHERE user_id = p_user_id AND is_primary = TRUE;
  ELSE
    -- Verifica se ha già un ruolo primary
    SELECT EXISTS(
      SELECT 1 FROM user_roles
      WHERE user_id = p_user_id AND is_primary = TRUE AND is_active = TRUE
    ) INTO v_has_primary;

    -- Se non ha primary, questo diventa primary
    IF NOT v_has_primary THEN
      p_is_primary := TRUE;
    END IF;
  END IF;

  -- Inserisci nuovo ruolo
  INSERT INTO user_roles (user_id, role_type, centro_id, organization_id, is_primary)
  VALUES (p_user_id, p_role_type, p_centro_id, p_organization_id, p_is_primary)
  RETURNING id INTO v_new_role_id;

  RETURN v_new_role_id;
END;
$$;

-- Funzione: Switch ruolo attivo
CREATE OR REPLACE FUNCTION switch_user_role(p_user_id UUID, p_role_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica che il ruolo appartenga all'utente
  IF NOT EXISTS(
    SELECT 1 FROM user_roles
    WHERE id = p_role_id AND user_id = p_user_id AND is_active = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Rimuovi primary da tutti i ruoli
  UPDATE user_roles
  SET is_primary = FALSE, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Imposta il nuovo ruolo come primary
  UPDATE user_roles
  SET is_primary = TRUE, updated_at = NOW()
  WHERE id = p_role_id;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- STEP 6: RLS Policies
-- =====================================================

-- Abilita RLS su user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: utenti vedono i propri ruoli
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: admin gestisce tutti i ruoli
DROP POLICY IF EXISTS "Admin can manage all roles" ON user_roles;
CREATE POLICY "Admin can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (ruolo = 'admin' OR ruolo_livello = 'admin')
    )
  );

-- Abilita RLS su organization_subscriptions
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: admin gestisce abbonamenti
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON organization_subscriptions;
CREATE POLICY "Admin can manage subscriptions" ON organization_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (ruolo = 'admin' OR ruolo_livello = 'admin')
    )
  );

-- =====================================================
-- FATTO!
-- =====================================================
SELECT 'Migrazione completata con successo!' as status;
