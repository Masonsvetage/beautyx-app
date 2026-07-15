-- ============================================================================
-- MIGRAZIONE: Sistema Documenti Legali, Policy e Accettazioni Obbligatorie
-- Eseguire nel Supabase Dashboard SQL Editor
-- ============================================================================

-- 1. Tabella admin_settings (configurazione globale admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  chiave VARCHAR(100) PRIMARY KEY,
  valore TEXT NOT NULL,
  descrizione TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

INSERT INTO admin_settings (chiave, valore, descrizione)
VALUES ('gdpr_retention_years', '5', 'Anni di conservazione profili inattivi (GDPR)')
ON CONFLICT (chiave) DO NOTHING;

INSERT INTO admin_settings (chiave, valore, descrizione)
VALUES ('legal_acceptance_days', '15', 'Giorni per accettare le modifiche ai documenti legali')
ON CONFLICT (chiave) DO NOTHING;

-- 2. Tabella legal_documents (documenti legali versionati)
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('condizioni_contrattuali', 'informativa_privacy')),
  versione INTEGER NOT NULL DEFAULT 1,
  titolo VARCHAR(200) NOT NULL,
  contenuto TEXT NOT NULL,
  pubblicato_il TIMESTAMPTZ,
  scadenza_accettazione TIMESTAMPTZ,
  creato_da UUID REFERENCES user_profiles(id),
  note_modifica TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_docs_tipo_versione ON legal_documents(tipo, versione DESC);
CREATE INDEX IF NOT EXISTS idx_legal_docs_pubblicato ON legal_documents(pubblicato_il) WHERE pubblicato_il IS NOT NULL;

-- 3. Tabella legal_clauses (clausole, con flag vessatorie)
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_clauses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  titolo VARCHAR(200) NOT NULL,
  contenuto TEXT NOT NULL,
  ordinamento INTEGER DEFAULT 0,
  richiede_accettazione_singola BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_clauses_doc ON legal_clauses(document_id);

-- 4. Tabella legal_acceptances (storico accettazioni documenti)
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  accettato_il TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc ON legal_acceptances(document_id);

-- 5. Tabella legal_clause_acceptances (accettazioni singole clausole vessatorie)
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_clause_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES legal_clauses(id) ON DELETE CASCADE,
  accettato_il TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, clause_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_clause_acc_user ON legal_clause_acceptances(user_id);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- 6. get_current_legal_documents: ritorna i documenti pubblicati piu' recenti (uno per tipo)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_legal_documents()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(doc_with_clauses)
  INTO v_result
  FROM (
    SELECT DISTINCT ON (d.tipo)
      d.id,
      d.tipo,
      d.versione,
      d.titolo,
      d.contenuto,
      d.pubblicato_il,
      d.scadenza_accettazione,
      d.note_modifica,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'titolo', c.titolo,
            'contenuto', c.contenuto,
            'ordinamento', c.ordinamento,
            'richiede_accettazione_singola', c.richiede_accettazione_singola
          ) ORDER BY c.ordinamento
        ), '[]'::json)
        FROM legal_clauses c WHERE c.document_id = d.id
      ) AS clausole
    FROM legal_documents d
    WHERE d.pubblicato_il IS NOT NULL
    ORDER BY d.tipo, d.versione DESC
  ) doc_with_clauses;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 7. get_user_legal_status: stato accettazione per un utente
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_legal_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(doc_status)
  INTO v_result
  FROM (
    SELECT DISTINCT ON (d.tipo)
      d.id AS document_id,
      d.tipo,
      d.versione,
      d.titolo,
      d.contenuto,
      d.pubblicato_il,
      d.scadenza_accettazione,
      d.note_modifica,
      la.accettato_il,
      CASE
        WHEN la.accettato_il IS NOT NULL THEN 'accettato'
        WHEN d.scadenza_accettazione < NOW() THEN 'scaduto'
        ELSE 'pendente'
      END AS stato,
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'titolo', c.titolo,
            'contenuto', c.contenuto,
            'ordinamento', c.ordinamento,
            'richiede_accettazione_singola', c.richiede_accettazione_singola,
            'accettata', EXISTS(
              SELECT 1 FROM legal_clause_acceptances lca
              WHERE lca.clause_id = c.id AND lca.user_id = p_user_id
            )
          ) ORDER BY c.ordinamento
        ), '[]'::json)
        FROM legal_clauses c WHERE c.document_id = d.id
      ) AS clausole
    FROM legal_documents d
    LEFT JOIN legal_acceptances la ON la.document_id = d.id AND la.user_id = p_user_id
    WHERE d.pubblicato_il IS NOT NULL
    ORDER BY d.tipo, d.versione DESC
  ) doc_status;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 8. check_legal_compliance: cron - sospende profili non conformi
-- ============================================================================
CREATE OR REPLACE FUNCTION check_legal_compliance()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_doc RECORD;
  v_user RECORD;
BEGIN
  -- Per ogni documento corrente con scadenza accettazione passata
  FOR v_doc IN
    SELECT DISTINCT ON (d.tipo) d.id, d.tipo, d.scadenza_accettazione
    FROM legal_documents d
    WHERE d.pubblicato_il IS NOT NULL
      AND d.scadenza_accettazione IS NOT NULL
      AND d.scadenza_accettazione < NOW()
    ORDER BY d.tipo, d.versione DESC
  LOOP
    -- Trova utenti attivi che non hanno accettato questo documento
    FOR v_user IN
      SELECT up.id
      FROM user_profiles up
      WHERE up.attivo = TRUE
        AND up.profilo_bloccato IS NOT TRUE
        AND up.ruolo_livello NOT IN ('admin')
        AND NOT EXISTS (
          SELECT 1 FROM legal_acceptances la
          WHERE la.user_id = up.id AND la.document_id = v_doc.id
        )
    LOOP
      -- Sospendi il profilo
      UPDATE user_profiles
      SET
        profilo_bloccato = TRUE,
        profilo_bloccato_motivo = 'Mancata accettazione documenti legali entro i termini previsti',
        profilo_bloccato_data = NOW(),
        updated_at = NOW()
      WHERE id = v_user.id;

      -- Avvia decorrenza cancellazione se non gia' in corso
      UPDATE user_profiles
      SET
        cancellazione_richiesta_il = NOW(),
        cancellazione_motivo = 'Sospensione per mancata accettazione documenti legali'
      WHERE id = v_user.id
        AND cancellazione_richiesta_il IS NULL;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 9. get_admin_setting / set_admin_setting
-- ============================================================================
CREATE OR REPLACE FUNCTION get_admin_setting(p_chiave VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valore TEXT;
BEGIN
  SELECT valore INTO v_valore FROM admin_settings WHERE chiave = p_chiave;
  RETURN v_valore;
END;
$$;

CREATE OR REPLACE FUNCTION set_admin_setting(p_chiave VARCHAR, p_valore TEXT, p_admin_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica admin
  IF NOT EXISTS(
    SELECT 1 FROM user_profiles WHERE id = p_admin_id AND ruolo_livello = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono modificare le impostazioni';
  END IF;

  INSERT INTO admin_settings (chiave, valore, updated_at, updated_by)
  VALUES (p_chiave, p_valore, NOW(), p_admin_id)
  ON CONFLICT (chiave)
  DO UPDATE SET valore = p_valore, updated_at = NOW(), updated_by = p_admin_id;

  RETURN TRUE;
END;
$$;

-- 10. cleanup_inactive_users: versione parametrica (sostituisce cleanup_inactive_users_5years)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_inactive_users(p_years INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE user_profiles
  SET
    cancellazione_richiesta_il = NOW(),
    cancellazione_effettiva_il = NOW() + INTERVAL '30 days',
    cancellazione_motivo = 'Inattivita superiore a ' || p_years || ' anni (GDPR)',
    updated_at = NOW()
  WHERE
    ultimo_accesso IS NOT NULL
    AND ultimo_accesso < NOW() - (p_years || ' years')::INTERVAL
    AND cancellazione_richiesta_il IS NULL
    AND ruolo_livello NOT IN ('admin')
    AND attivo = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- legal_documents: tutti possono leggere i pubblicati, solo admin scrive
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_documents_read_published" ON legal_documents
  FOR SELECT USING (pubblicato_il IS NOT NULL);

CREATE POLICY "legal_documents_admin_all" ON legal_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- legal_clauses: tutti possono leggere, solo admin scrive
ALTER TABLE legal_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_clauses_read" ON legal_clauses
  FOR SELECT USING (TRUE);

CREATE POLICY "legal_clauses_admin_all" ON legal_clauses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- legal_acceptances: utente vede le proprie, admin vede tutto
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_acceptances_own" ON legal_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "legal_acceptances_insert_own" ON legal_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "legal_acceptances_admin" ON legal_acceptances
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- legal_clause_acceptances: utente vede le proprie, admin vede tutto
ALTER TABLE legal_clause_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_clause_acc_own" ON legal_clause_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "legal_clause_acc_insert_own" ON legal_clause_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "legal_clause_acc_admin" ON legal_clause_acceptances
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- admin_settings: solo admin
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_settings_admin_all" ON admin_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- ============================================================================
-- FINE MIGRAZIONE
-- ============================================================================
