-- =====================================================
-- Migration: Admin Announcements / Messaging System
-- Data: 2026-02-10
-- Descrizione: Sistema annunci e comunicazioni admin verso
--   utenti con targeting (broadcast, ruolo, centro, utente)
-- =====================================================

-- =====================================================
-- 1. Tabella admin_announcements
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES user_profiles(id),
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('broadcast', 'role', 'centro', 'user')),
  target_filter JSONB DEFAULT '{}',
  titolo VARCHAR(200) NOT NULL,
  contenuto TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'informazione' CHECK (tipo IN ('informazione', 'avviso', 'promozione', 'urgente', 'manutenzione')),
  display_mode VARCHAR(20) DEFAULT 'banner' CHECK (display_mode IN ('banner', 'notification', 'modal')),
  data_inizio TIMESTAMPTZ DEFAULT NOW(),
  data_fine TIMESTAMPTZ,
  stato VARCHAR(20) DEFAULT 'bozza' CHECK (stato IN ('bozza', 'programmato', 'attivo', 'scaduto', 'annullato')),
  visualizzazioni INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Tabella announcement_receipts
-- =====================================================
CREATE TABLE IF NOT EXISTS announcement_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES admin_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  letto BOOLEAN DEFAULT FALSE,
  letto_at TIMESTAMPTZ,
  dismissato BOOLEAN DEFAULT FALSE,
  dismissato_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- =====================================================
-- 3. Indici per performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_announcements_stato_inizio
  ON admin_announcements(stato, data_inizio);

CREATE INDEX IF NOT EXISTS idx_announcements_sender
  ON admin_announcements(sender_id);

CREATE INDEX IF NOT EXISTS idx_receipts_user_letto
  ON announcement_receipts(user_id, letto);

CREATE INDEX IF NOT EXISTS idx_receipts_announcement
  ON announcement_receipts(announcement_id);

-- =====================================================
-- 4. RLS Policies
-- =====================================================

-- --- admin_announcements ---
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

-- Admin puo' fare tutto sugli annunci
CREATE POLICY "Admin full access on announcements"
  ON admin_announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );

-- Utenti possono vedere solo annunci attivi e nel periodo valido
CREATE POLICY "Users can view active announcements"
  ON admin_announcements
  FOR SELECT TO authenticated
  USING (
    stato = 'attivo'
    AND data_inizio <= NOW()
    AND (data_fine IS NULL OR data_fine > NOW())
  );

-- --- announcement_receipts ---
ALTER TABLE announcement_receipts ENABLE ROW LEVEL SECURITY;

-- Admin puo' fare tutto sulle ricevute
CREATE POLICY "Admin full access on receipts"
  ON announcement_receipts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );

-- Utenti possono inserire le proprie ricevute
CREATE POLICY "Users can insert own receipts"
  ON announcement_receipts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Utenti possono aggiornare le proprie ricevute (letto, dismissato)
CREATE POLICY "Users can update own receipts"
  ON announcement_receipts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Utenti possono leggere le proprie ricevute
CREATE POLICY "Users can view own receipts"
  ON announcement_receipts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 5. Trigger per updated_at su admin_announcements
-- =====================================================
CREATE OR REPLACE FUNCTION update_admin_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_admin_announcements_updated_at ON admin_announcements;
CREATE TRIGGER trigger_admin_announcements_updated_at
  BEFORE UPDATE ON admin_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_announcements_updated_at();

-- =====================================================
-- 6. Funzione get_user_announcements
--    Restituisce annunci attivi non-dismissati per l'utente,
--    filtrati in base al targeting (broadcast/role/centro/user)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_announcements(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  titolo VARCHAR(200),
  contenuto TEXT,
  tipo VARCHAR(30),
  display_mode VARCHAR(20),
  data_inizio TIMESTAMPTZ,
  sender_nome TEXT,
  letto BOOLEAN,
  dismissato BOOLEAN
) AS $$
DECLARE
  v_ruolo TEXT;
  v_centro_id UUID;
BEGIN
  -- Recupera ruolo e centro dell'utente
  SELECT up.ruolo_livello, up.centro_id
    INTO v_ruolo, v_centro_id
  FROM user_profiles up
  WHERE up.id = p_user_id;

  RETURN QUERY
  SELECT
    a.id,
    a.titolo,
    a.contenuto,
    a.tipo,
    a.display_mode,
    a.data_inizio,
    COALESCE(sp.nome || ' ' || sp.cognome, sp.email) AS sender_nome,
    COALESCE(ar.letto, FALSE) AS letto,
    COALESCE(ar.dismissato, FALSE) AS dismissato
  FROM admin_announcements a
  JOIN user_profiles sp ON sp.id = a.sender_id
  LEFT JOIN announcement_receipts ar
    ON ar.announcement_id = a.id AND ar.user_id = p_user_id
  WHERE a.stato = 'attivo'
    AND a.data_inizio <= NOW()
    AND (a.data_fine IS NULL OR a.data_fine > NOW())
    -- Escludi annunci gia' dismissati
    AND COALESCE(ar.dismissato, FALSE) = FALSE
    -- Filtra in base al target_type
    AND (
      -- broadcast: tutti gli utenti
      a.target_type = 'broadcast'
      -- role: il ruolo_livello dell'utente e' nell'array target_filter->'roles'
      OR (
        a.target_type = 'role'
        AND a.target_filter->'roles' IS NOT NULL
        AND a.target_filter->'roles' @> to_jsonb(v_ruolo)
      )
      -- centro: il centro_id dell'utente e' nell'array target_filter->'centro_ids'
      OR (
        a.target_type = 'centro'
        AND v_centro_id IS NOT NULL
        AND a.target_filter->'centro_ids' IS NOT NULL
        AND a.target_filter->'centro_ids' @> to_jsonb(v_centro_id::text)
      )
      -- user: l'id dell'utente e' nell'array target_filter->'user_ids'
      OR (
        a.target_type = 'user'
        AND a.target_filter->'user_ids' IS NOT NULL
        AND a.target_filter->'user_ids' @> to_jsonb(p_user_id::text)
      )
    )
  ORDER BY
    -- Urgenti prima, poi per data piu' recente
    CASE WHEN a.tipo = 'urgente' THEN 0 ELSE 1 END,
    a.data_inizio DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Commenti per documentazione
-- =====================================================
COMMENT ON TABLE admin_announcements IS 'Annunci e comunicazioni inviate dall''admin verso utenti con targeting granulare';
COMMENT ON TABLE announcement_receipts IS 'Ricevute di lettura/dismissione degli annunci per ciascun utente';
COMMENT ON COLUMN admin_announcements.target_type IS 'broadcast=tutti, role=per ruolo, centro=per centro, user=utenti specifici';
COMMENT ON COLUMN admin_announcements.target_filter IS 'Filtro JSON: {"roles":["titolare","hpa"]}, {"centro_ids":["uuid"]}, {"user_ids":["uuid"]}';
COMMENT ON COLUMN admin_announcements.tipo IS 'informazione, avviso, promozione, urgente, manutenzione';
COMMENT ON COLUMN admin_announcements.display_mode IS 'banner=barra superiore, notification=campanella, modal=finestra modale';
COMMENT ON COLUMN admin_announcements.stato IS 'bozza, programmato, attivo, scaduto, annullato';
COMMENT ON FUNCTION get_user_announcements(UUID) IS 'Restituisce annunci attivi non-dismissati per l''utente, filtrati per targeting';
