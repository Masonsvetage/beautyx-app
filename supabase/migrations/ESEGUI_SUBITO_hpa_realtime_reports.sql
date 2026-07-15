-- =====================================================
-- Migration: HPA Realtime Chat + Session Reports
-- Data: 2026-02-12
-- Descrizione: Abilita Realtime su hpa_client_messages,
--              crea tabella report sessione HPA,
--              RPC per storico BeautyX accessibile da HPA
-- =====================================================

-- =====================================================
-- 1. ABILITARE REALTIME SULLA TABELLA MESSAGGI
-- =====================================================
-- Permette subscription client-side per messaggi in tempo reale
ALTER PUBLICATION supabase_realtime ADD TABLE hpa_client_messages;

-- =====================================================
-- 2. TABELLA REPORT SESSIONE HPA
-- =====================================================
CREATE TABLE IF NOT EXISTS hpa_session_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hpa_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,

  -- Campi strutturati del report
  sintesi TEXT NOT NULL,                          -- Sintesi dell'incontro
  punti_forza TEXT,                               -- Punti di forza del cliente
  punti_debolezza TEXT,                           -- Punti di debolezza / aree di miglioramento
  obiettivi_stato VARCHAR(30) DEFAULT 'non_definiti'
    CHECK (obiettivi_stato IN (
      'non_definiti',        -- L'utente non ha definito obiettivi
      'definiti_non_focalizzato', -- Obiettivi definiti ma utente non focalizzato
      'focalizzato',         -- Utente focalizzato sugli obiettivi
      'raggiunto',           -- Obiettivo raggiunto
      'superato'             -- Obiettivo superato
    )),
  obiettivi_note TEXT,                            -- Note aggiuntive sugli obiettivi
  valutazione_beautyx VARCHAR(20) DEFAULT 'sufficiente'
    CHECK (valutazione_beautyx IN (
      'eccellente', 'buono', 'sufficiente', 'insufficiente', 'critico'
    )),
  valutazione_beautyx_note TEXT,                  -- Note sul rapporto utente/BeautyX
  valutazione_punteggio INTEGER CHECK (valutazione_punteggio BETWEEN 1 AND 5),
  raccomandazioni TEXT,                           -- Raccomandazioni per prossimi passi

  -- Metadati
  durata_minuti INTEGER,                          -- Durata stimata della sessione chat
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_hpa_reports_centro ON hpa_session_reports(centro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hpa_reports_hpa ON hpa_session_reports(hpa_id, created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_hpa_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hpa_report_updated_at ON hpa_session_reports;
CREATE TRIGGER trg_hpa_report_updated_at
  BEFORE UPDATE ON hpa_session_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_hpa_report_updated_at();

-- =====================================================
-- 3. RLS POLICIES PER hpa_session_reports
-- =====================================================
ALTER TABLE hpa_session_reports ENABLE ROW LEVEL SECURITY;

-- Admin puo' vedere tutti i report
CREATE POLICY "Admin can view all reports" ON hpa_session_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );

-- HPA puo' inserire report per i centri a lui assegnati
CREATE POLICY "HPA can insert reports for assigned centers" ON hpa_session_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    hpa_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'hpa'
    )
    AND centro_id IN (
      SELECT hca.centro_id FROM hpa_centro_assignments hca
      WHERE hca.hpa_id = auth.uid()
      AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
    )
  );

-- HPA puo' vedere i propri report + report di centri a lui assegnati (per subentro)
CREATE POLICY "HPA can view reports for assigned centers" ON hpa_session_reports
  FOR SELECT TO authenticated
  USING (
    hpa_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND ruolo_livello = 'hpa'
      )
      AND centro_id IN (
        SELECT hca.centro_id FROM hpa_centro_assignments hca
        WHERE hca.hpa_id = auth.uid()
        AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
      )
    )
  );

-- HPA puo' aggiornare solo i propri report (entro 24h)
CREATE POLICY "HPA can update own recent reports" ON hpa_session_reports
  FOR UPDATE TO authenticated
  USING (
    hpa_id = auth.uid()
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  WITH CHECK (
    hpa_id = auth.uid()
  );

-- =====================================================
-- 4. RPC: STORICO CONVERSAZIONI BEAUTYX PER CENTRO
-- =====================================================
-- Permette all'HPA di vedere lo storico BeautyX del centro assegnato
CREATE OR REPLACE FUNCTION get_centro_beautyx_conversations(
  p_centro_id UUID,
  p_hpa_id UUID
)
RETURNS TABLE (
  id UUID,
  titolo TEXT,
  data_inizio TIMESTAMPTZ,
  data_ultimo_messaggio TIMESTAMPTZ,
  messaggi_count INTEGER,
  attiva BOOLEAN,
  pinned_by_hpa BOOLEAN
) AS $$
BEGIN
  -- Verifica che l'HPA sia assegnato al centro
  IF NOT EXISTS (
    SELECT 1 FROM hpa_centro_assignments
    WHERE hpa_id = p_hpa_id AND centro_id = p_centro_id
    AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
  ) AND NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = p_hpa_id AND ruolo_livello = 'admin'
  ) THEN
    RAISE EXCEPTION 'HPA non assegnato a questo centro';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.titolo,
    c.data_inizio,
    c.data_ultimo_messaggio,
    c.messaggi_count,
    c.attiva,
    c.pinned_by_hpa
  FROM beautyx_conversations c
  WHERE c.centro_id = p_centro_id
    AND c.deleted_at IS NULL
  ORDER BY c.data_ultimo_messaggio DESC NULLS LAST, c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. RPC: MESSAGGI DI UNA CONVERSAZIONE BEAUTYX
-- =====================================================
CREATE OR REPLACE FUNCTION get_beautyx_conversation_messages(
  p_conversation_id UUID,
  p_hpa_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sender VARCHAR(20),
  contenuto TEXT,
  page_context VARCHAR(50),
  "timestamp" TIMESTAMPTZ
) AS $$
DECLARE
  v_centro_id UUID;
BEGIN
  -- Ottieni il centro_id della conversazione
  SELECT c.centro_id INTO v_centro_id
  FROM beautyx_conversations c
  WHERE c.id = p_conversation_id;

  IF v_centro_id IS NULL THEN
    RAISE EXCEPTION 'Conversazione non trovata';
  END IF;

  -- Verifica accesso HPA
  IF NOT EXISTS (
    SELECT 1 FROM hpa_centro_assignments
    WHERE hpa_id = p_hpa_id AND centro_id = v_centro_id
    AND (data_fine IS NULL OR data_fine >= CURRENT_DATE)
  ) AND NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = p_hpa_id AND ruolo_livello = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.sender,
    m.contenuto,
    m.page_context,
    m.timestamp
  FROM beautyx_messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.timestamp ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. RPC: CONTEGGIO REPORT PER CENTRO
-- =====================================================
CREATE OR REPLACE FUNCTION get_centro_reports_summary(p_centro_id UUID)
RETURNS TABLE (
  total_reports BIGINT,
  ultimo_report TIMESTAMPTZ,
  media_punteggio NUMERIC,
  hpa_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_reports,
    MAX(r.created_at) as ultimo_report,
    ROUND(AVG(r.valutazione_punteggio)::NUMERIC, 1) as media_punteggio,
    COUNT(DISTINCT r.hpa_id)::BIGINT as hpa_count
  FROM hpa_session_reports r
  WHERE r.centro_id = p_centro_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTI
-- =====================================================
COMMENT ON TABLE hpa_session_reports IS 'Report strutturati delle sessioni chat HPA-Cliente';
COMMENT ON FUNCTION get_centro_beautyx_conversations IS 'Storico conversazioni BeautyX di un centro per HPA';
COMMENT ON FUNCTION get_beautyx_conversation_messages IS 'Messaggi di una conversazione BeautyX per HPA';
COMMENT ON FUNCTION get_centro_reports_summary IS 'Riepilogo report HPA per un centro';
