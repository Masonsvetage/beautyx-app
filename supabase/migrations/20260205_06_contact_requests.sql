-- =====================================================
-- Migration: Contact Requests System
-- Data: 2026-02-05
-- Descrizione: Sistema richieste contatto urgenti dai clienti
-- =====================================================

-- 1. Tabella richieste di contatto
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  richiedente_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  -- Livello urgenza
  urgenza VARCHAR(20) DEFAULT 'normale' CHECK (urgenza IN ('bassa', 'normale', 'alta', 'urgente')),
  -- Contenuto
  oggetto VARCHAR(200),
  motivo TEXT NOT NULL,
  -- Stato gestione
  stato VARCHAR(20) DEFAULT 'pending' CHECK (stato IN ('pending', 'in_lavorazione', 'completato', 'annullato')),
  -- Assegnazione e risposta
  assegnato_a UUID REFERENCES user_profiles(id), -- HPA che gestisce
  preso_in_carico_at TIMESTAMPTZ,
  risposta TEXT,
  risposto_at TIMESTAMPTZ,
  -- Preferenze contatto
  preferenza_contatto VARCHAR(30) DEFAULT 'qualsiasi' CHECK (preferenza_contatto IN ('qualsiasi', 'chat', 'call', 'email')),
  orario_preferito VARCHAR(100), -- es: "mattina", "14:00-18:00"
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indici per performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_centro ON contact_requests(centro_id, stato, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_pending ON contact_requests(stato, urgenza DESC) WHERE stato = 'pending';
CREATE INDEX IF NOT EXISTS idx_contact_requests_urgenti ON contact_requests(urgenza, created_at DESC) WHERE stato = 'pending' AND urgenza IN ('alta', 'urgente');
CREATE INDEX IF NOT EXISTS idx_contact_requests_assegnato ON contact_requests(assegnato_a, stato) WHERE assegnato_a IS NOT NULL;

-- 3. RLS Policies
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Admin può vedere tutto
CREATE POLICY "Admin can manage all contact requests" ON contact_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- HPA può vedere/gestire richieste dei centri assegnati
CREATE POLICY "HPA can manage assigned center requests" ON contact_requests
  FOR ALL TO authenticated
  USING (
    centro_id IN (
      SELECT hca.centro_id FROM hpa_centro_assignments hca
      WHERE hca.hpa_id = auth.uid()
      AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
    )
    OR assegnato_a = auth.uid()
  );

-- Cliente può vedere/creare richieste del proprio centro
CREATE POLICY "Client can view own center requests" ON contact_requests
  FOR SELECT TO authenticated
  USING (
    centro_id IN (SELECT up.centro_id FROM user_profiles up WHERE up.id = auth.uid())
  );

CREATE POLICY "Client can create requests" ON contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    centro_id IN (SELECT up.centro_id FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 4. Trigger per updated_at
DROP TRIGGER IF EXISTS trigger_contact_requests_updated ON contact_requests;
CREATE TRIGGER trigger_contact_requests_updated
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 5. Funzione per ottenere richieste urgenti per HPA
CREATE OR REPLACE FUNCTION get_urgent_contact_requests(p_hpa_id UUID)
RETURNS TABLE (
  id UUID,
  centro_id UUID,
  centro_nome TEXT,
  urgenza VARCHAR(20),
  oggetto VARCHAR(200),
  motivo TEXT,
  stato VARCHAR(20),
  preferenza_contatto VARCHAR(30),
  created_at TIMESTAMPTZ,
  ore_attesa NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.centro_id,
    bc.nome::TEXT as centro_nome,
    cr.urgenza,
    cr.oggetto,
    cr.motivo,
    cr.stato,
    cr.preferenza_contatto,
    cr.created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - cr.created_at)) / 3600, 1) as ore_attesa
  FROM contact_requests cr
  JOIN beauty_centers bc ON bc.id = cr.centro_id
  WHERE cr.stato = 'pending'
  AND cr.centro_id IN (
    SELECT hca.centro_id FROM hpa_centro_assignments hca
    WHERE hca.hpa_id = p_hpa_id
    AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
  )
  ORDER BY
    CASE cr.urgenza
      WHEN 'urgente' THEN 1
      WHEN 'alta' THEN 2
      WHEN 'normale' THEN 3
      WHEN 'bassa' THEN 4
    END,
    cr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Funzione per prendere in carico una richiesta
CREATE OR REPLACE FUNCTION take_contact_request(
  p_request_id UUID,
  p_hpa_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE contact_requests
  SET
    stato = 'in_lavorazione',
    assegnato_a = p_hpa_id,
    preso_in_carico_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id
  AND stato = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funzione per rispondere a una richiesta
CREATE OR REPLACE FUNCTION respond_to_contact_request(
  p_request_id UUID,
  p_risposta TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE contact_requests
  SET
    stato = 'completato',
    risposta = p_risposta,
    risposto_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id
  AND stato = 'in_lavorazione';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Vista riepilogo richieste per dashboard HPA
CREATE OR REPLACE VIEW hpa_contact_requests_summary AS
SELECT
  hca.hpa_id,
  COUNT(*) FILTER (WHERE cr.stato = 'pending') as pending_totali,
  COUNT(*) FILTER (WHERE cr.stato = 'pending' AND cr.urgenza = 'urgente') as urgenti,
  COUNT(*) FILTER (WHERE cr.stato = 'pending' AND cr.urgenza = 'alta') as alta_priorita,
  COUNT(*) FILTER (WHERE cr.stato = 'in_lavorazione' AND cr.assegnato_a = hca.hpa_id) as in_lavorazione,
  COUNT(*) FILTER (WHERE cr.stato = 'completato' AND cr.assegnato_a = hca.hpa_id AND cr.risposto_at > NOW() - INTERVAL '7 days') as completate_settimana,
  (
    SELECT cr2.created_at FROM contact_requests cr2
    WHERE cr2.centro_id = ANY(ARRAY_AGG(hca.centro_id))
    AND cr2.stato = 'pending'
    ORDER BY
      CASE cr2.urgenza WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 ELSE 3 END,
      cr2.created_at
    LIMIT 1
  ) as piu_vecchia_pending
FROM hpa_centro_assignments hca
LEFT JOIN contact_requests cr ON cr.centro_id = hca.centro_id
WHERE hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE
GROUP BY hca.hpa_id;

-- 9. Funzione per statistiche tempo risposta HPA
CREATE OR REPLACE FUNCTION get_hpa_response_stats(p_hpa_id UUID)
RETURNS TABLE (
  richieste_totali BIGINT,
  richieste_completate BIGINT,
  tempo_medio_risposta_ore NUMERIC,
  tempo_medio_presa_carico_ore NUMERIC,
  tasso_completamento NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as richieste_totali,
    COUNT(*) FILTER (WHERE cr.stato = 'completato')::BIGINT as richieste_completate,
    ROUND(AVG(
      CASE WHEN cr.risposto_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (cr.risposto_at - cr.created_at)) / 3600
      END
    )::NUMERIC, 1) as tempo_medio_risposta_ore,
    ROUND(AVG(
      CASE WHEN cr.preso_in_carico_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (cr.preso_in_carico_at - cr.created_at)) / 3600
      END
    )::NUMERIC, 1) as tempo_medio_presa_carico_ore,
    ROUND(
      (COUNT(*) FILTER (WHERE cr.stato = 'completato')::NUMERIC /
       NULLIF(COUNT(*), 0) * 100)::NUMERIC, 1
    ) as tasso_completamento
  FROM contact_requests cr
  WHERE cr.assegnato_a = p_hpa_id
  OR cr.centro_id IN (
    SELECT hca.centro_id FROM hpa_centro_assignments hca
    WHERE hca.hpa_id = p_hpa_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE contact_requests IS 'Richieste di contatto dai clienti verso HPA';
COMMENT ON FUNCTION get_urgent_contact_requests IS 'Restituisce richieste urgenti pending per un HPA';
COMMENT ON FUNCTION take_contact_request IS 'Assegna una richiesta a un HPA';
COMMENT ON FUNCTION respond_to_contact_request IS 'Chiude una richiesta con risposta';
