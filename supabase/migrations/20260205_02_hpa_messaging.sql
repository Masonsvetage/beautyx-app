-- =====================================================
-- Migration: HPA Client Messaging System
-- Data: 2026-02-05
-- Descrizione: Sistema messaggistica testuale tra HPA e clienti
-- =====================================================

-- 1. Tabella messaggi HPA-Cliente
CREATE TABLE IF NOT EXISTS hpa_client_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hpa_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('hpa', 'client')),
  contenuto TEXT NOT NULL,
  letto BOOLEAN DEFAULT FALSE,
  letto_at TIMESTAMPTZ,
  -- Metadata per allegati futuri o contesto
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indici per performance
CREATE INDEX IF NOT EXISTS idx_hpa_messages_thread ON hpa_client_messages(hpa_id, centro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hpa_messages_unread_hpa ON hpa_client_messages(hpa_id, letto) WHERE letto = FALSE AND sender_type = 'client';
CREATE INDEX IF NOT EXISTS idx_hpa_messages_unread_client ON hpa_client_messages(centro_id, letto) WHERE letto = FALSE AND sender_type = 'hpa';
CREATE INDEX IF NOT EXISTS idx_hpa_messages_centro ON hpa_client_messages(centro_id, created_at DESC);

-- 3. RLS Policies
ALTER TABLE hpa_client_messages ENABLE ROW LEVEL SECURITY;

-- Admin può vedere tutto
CREATE POLICY "Admin can view all messages" ON hpa_client_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );

-- HPA può vedere/inviare messaggi dei propri centri assegnati
CREATE POLICY "HPA can manage assigned center messages" ON hpa_client_messages
  FOR ALL TO authenticated
  USING (
    hpa_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.ruolo_livello = 'hpa'
      )
      AND centro_id IN (
        SELECT hca.centro_id FROM hpa_centro_assignments hca
        WHERE hca.hpa_id = auth.uid()
        AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
      )
    )
  );

-- Cliente può vedere/inviare messaggi del proprio centro
CREATE POLICY "Client can manage own center messages" ON hpa_client_messages
  FOR ALL TO authenticated
  USING (
    centro_id IN (
      SELECT up.centro_id FROM user_profiles up
      WHERE up.id = auth.uid() AND up.centro_id IS NOT NULL
    )
  );

-- 4. Funzione per contare messaggi non letti
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS TABLE (
  centro_id UUID,
  centro_nome TEXT,
  unread_count BIGINT,
  last_message_at TIMESTAMPTZ
) AS $$
DECLARE
  v_ruolo TEXT;
BEGIN
  SELECT ruolo_livello INTO v_ruolo FROM user_profiles WHERE id = p_user_id;

  IF v_ruolo = 'hpa' THEN
    -- HPA vede messaggi non letti dai clienti
    RETURN QUERY
    SELECT
      m.centro_id,
      bc.nome as centro_nome,
      COUNT(*) as unread_count,
      MAX(m.created_at) as last_message_at
    FROM hpa_client_messages m
    JOIN beauty_centers bc ON m.centro_id = bc.id
    WHERE m.hpa_id = p_user_id
      AND m.sender_type = 'client'
      AND m.letto = FALSE
    GROUP BY m.centro_id, bc.nome;
  ELSE
    -- Cliente vede messaggi non letti dall'HPA
    RETURN QUERY
    SELECT
      m.centro_id,
      bc.nome as centro_nome,
      COUNT(*) as unread_count,
      MAX(m.created_at) as last_message_at
    FROM hpa_client_messages m
    JOIN beauty_centers bc ON m.centro_id = bc.id
    JOIN user_profiles up ON up.id = p_user_id AND up.centro_id = m.centro_id
    WHERE m.sender_type = 'hpa'
      AND m.letto = FALSE
    GROUP BY m.centro_id, bc.nome;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Funzione per ottenere thread messaggi con paginazione
CREATE OR REPLACE FUNCTION get_message_thread(
  p_hpa_id UUID,
  p_centro_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sender_type VARCHAR(10),
  contenuto TEXT,
  letto BOOLEAN,
  created_at TIMESTAMPTZ,
  sender_nome TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.sender_type,
    m.contenuto,
    m.letto,
    m.created_at,
    CASE
      WHEN m.sender_type = 'hpa' THEN (SELECT COALESCE(nome || ' ' || cognome, email) FROM user_profiles WHERE id = m.hpa_id)
      ELSE (SELECT bc.nome FROM beauty_centers bc WHERE bc.id = m.centro_id)
    END as sender_nome
  FROM hpa_client_messages m
  WHERE m.hpa_id = p_hpa_id
    AND m.centro_id = p_centro_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Funzione per segnare messaggi come letti
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_user_id UUID,
  p_centro_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_ruolo TEXT;
  v_count INTEGER;
BEGIN
  SELECT ruolo_livello INTO v_ruolo FROM user_profiles WHERE id = p_user_id;

  IF v_ruolo = 'hpa' THEN
    -- HPA segna come letti i messaggi dei clienti
    UPDATE hpa_client_messages
    SET letto = TRUE, letto_at = NOW()
    WHERE hpa_id = p_user_id
      AND centro_id = p_centro_id
      AND sender_type = 'client'
      AND letto = FALSE;
  ELSE
    -- Cliente segna come letti i messaggi dell'HPA
    UPDATE hpa_client_messages
    SET letto = TRUE, letto_at = NOW()
    WHERE centro_id = p_centro_id
      AND sender_type = 'hpa'
      AND letto = FALSE;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Vista riepilogo conversazioni per HPA
CREATE OR REPLACE VIEW hpa_conversations_summary AS
SELECT
  hca.hpa_id,
  hca.centro_id,
  bc.nome as centro_nome,
  (
    SELECT COUNT(*) FROM hpa_client_messages m
    WHERE m.hpa_id = hca.hpa_id AND m.centro_id = hca.centro_id
  ) as total_messages,
  (
    SELECT COUNT(*) FROM hpa_client_messages m
    WHERE m.hpa_id = hca.hpa_id AND m.centro_id = hca.centro_id
    AND m.sender_type = 'client' AND m.letto = FALSE
  ) as unread_from_client,
  (
    SELECT MAX(created_at) FROM hpa_client_messages m
    WHERE m.hpa_id = hca.hpa_id AND m.centro_id = hca.centro_id
  ) as last_message_at,
  (
    SELECT contenuto FROM hpa_client_messages m
    WHERE m.hpa_id = hca.hpa_id AND m.centro_id = hca.centro_id
    ORDER BY created_at DESC LIMIT 1
  ) as last_message_preview
FROM hpa_centro_assignments hca
JOIN beauty_centers bc ON bc.id = hca.centro_id
WHERE hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE;

COMMENT ON TABLE hpa_client_messages IS 'Messaggi diretti tra HPA e clienti (centri estetici)';
COMMENT ON VIEW hpa_conversations_summary IS 'Riepilogo conversazioni per dashboard HPA';
