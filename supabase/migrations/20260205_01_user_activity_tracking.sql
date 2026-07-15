-- =====================================================
-- Migration: User Activity Tracking
-- Data: 2026-02-05
-- Descrizione: Aggiunge tracking attività utenti per dashboard HPA
-- =====================================================

-- 1. Aggiungi campi a user_profiles per tracking veloce
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- 2. Crea tabella log attività dettagliato
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  centro_id UUID REFERENCES beauty_centers(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'page_view', 'obiettivo_creato', 'messaggio_inviato', etc.
  page_context VARCHAR(100), -- '/dashboard', '/movimenti', '/obiettivi', etc.
  metadata JSONB DEFAULT '{}', -- dati aggiuntivi specifici per tipo attività
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indici per performance
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_centro_date ON user_activity_log(centro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at DESC) WHERE last_login_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_activity ON user_profiles(last_activity_at DESC) WHERE last_activity_at IS NOT NULL;

-- 4. RLS Policies
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin può vedere tutto
CREATE POLICY "Admin can view all activity" ON user_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );

-- HPA può vedere attività dei centri assegnati
CREATE POLICY "HPA can view assigned centers activity" ON user_activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.ruolo_livello = 'hpa'
    )
    AND (
      centro_id IN (
        SELECT centro_id FROM hpa_centro_assignments
        WHERE hpa_id = auth.uid()
        AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
      )
    )
  );

-- Utente può vedere la propria attività
CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Solo il sistema può inserire (via service role)
CREATE POLICY "Service can insert activity" ON user_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Funzione per aggiornare last_login e conteggio
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'login' THEN
    UPDATE user_profiles
    SET
      last_login_at = NEW.created_at,
      login_count = COALESCE(login_count, 0) + 1,
      last_activity_at = NEW.created_at
    WHERE id = NEW.user_id;
  ELSE
    UPDATE user_profiles
    SET last_activity_at = NEW.created_at
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger per aggiornamento automatico
DROP TRIGGER IF EXISTS trigger_update_login_stats ON user_activity_log;
CREATE TRIGGER trigger_update_login_stats
  AFTER INSERT ON user_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_login_stats();

-- 7. Funzione helper per ottenere utenti inattivi
CREATE OR REPLACE FUNCTION get_inactive_users(
  p_hpa_id UUID,
  p_days_threshold INTEGER DEFAULT 7
)
RETURNS TABLE (
  user_id UUID,
  centro_id UUID,
  centro_nome TEXT,
  email TEXT,
  nome TEXT,
  cognome TEXT,
  last_activity_at TIMESTAMPTZ,
  days_inactive INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id as user_id,
    bc.id as centro_id,
    bc.nome as centro_nome,
    up.email,
    up.nome,
    up.cognome,
    up.last_activity_at,
    COALESCE(
      EXTRACT(DAY FROM NOW() - up.last_activity_at)::INTEGER,
      999
    ) as days_inactive
  FROM user_profiles up
  JOIN beauty_centers bc ON up.centro_id = bc.id
  WHERE bc.id IN (
    SELECT hca.centro_id
    FROM hpa_centro_assignments hca
    WHERE hca.hpa_id = p_hpa_id
    AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
  )
  AND up.attivo = true
  AND up.ruolo_livello IN ('titolare', 'direttore', 'amministrativo')
  AND (
    up.last_activity_at IS NULL
    OR up.last_activity_at < NOW() - (p_days_threshold || ' days')::INTERVAL
  )
  ORDER BY days_inactive DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_activity_log IS 'Log delle attività utenti per tracking engagement e dashboard HPA';
COMMENT ON FUNCTION get_inactive_users IS 'Restituisce utenti inattivi per un HPA specifico';
