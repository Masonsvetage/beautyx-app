-- ============================================================================
-- MIGRAZIONE GDPR: Eliminazione utenti e conformità privacy
-- Eseguire nel Supabase Dashboard SQL Editor
-- ============================================================================

-- 1. Nuove colonne su user_profiles
-- ============================================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cancellazione_richiesta_il TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cancellazione_effettiva_il TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cancellazione_motivo TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ultimo_accesso TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.cancellazione_richiesta_il IS 'Data richiesta eliminazione account';
COMMENT ON COLUMN user_profiles.cancellazione_effettiva_il IS 'Data in cui l''accesso verra bloccato definitivamente';
COMMENT ON COLUMN user_profiles.cancellazione_motivo IS 'Motivo eliminazione (utente/admin/inattivita)';
COMMENT ON COLUMN user_profiles.ultimo_accesso IS 'Ultimo accesso per controllo inattivita GDPR 5 anni';

-- Indice per le query cron di pulizia
CREATE INDEX IF NOT EXISTS idx_user_profiles_ultimo_accesso ON user_profiles(ultimo_accesso) WHERE ultimo_accesso IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_cancellazione ON user_profiles(cancellazione_effettiva_il) WHERE cancellazione_effettiva_il IS NOT NULL;

-- 2. RPC: Eliminazione utente da admin (hard delete profilo, cascade)
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_delete_user_data(
  p_user_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica che il chiamante sia admin
  IF NOT EXISTS(
    SELECT 1 FROM user_profiles
    WHERE id = p_admin_id AND ruolo_livello = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono eliminare utenti';
  END IF;

  -- Non puoi eliminare te stesso
  IF p_user_id = p_admin_id THEN
    RAISE EXCEPTION 'Non puoi eliminare il tuo stesso account';
  END IF;

  -- Non puoi eliminare altri admin
  IF EXISTS(
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND ruolo_livello = 'admin'
  ) THEN
    RAISE EXCEPTION 'Non puoi eliminare un altro amministratore';
  END IF;

  -- Verifica che l'utente esista
  IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utente non trovato';
  END IF;

  -- Elimina profilo (cascade a user_roles, user_subscriptions, ecc.)
  DELETE FROM user_profiles WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 3. RPC: Richiesta auto-cancellazione utente
-- ============================================================================
CREATE OR REPLACE FUNCTION request_account_deletion(
  p_user_id UUID,
  p_motivo TEXT DEFAULT 'Richiesta dall''utente'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub_data_fine TIMESTAMPTZ;
  v_effettiva_il TIMESTAMPTZ;
  v_giorni INTEGER;
BEGIN
  -- Controlla se c'e gia una richiesta pendente
  IF EXISTS(
    SELECT 1 FROM user_profiles
    WHERE id = p_user_id AND cancellazione_richiesta_il IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Hai gia una richiesta di cancellazione in corso';
  END IF;

  -- Cerca la data di fine abbonamento attivo
  SELECT data_fine INTO v_sub_data_fine
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND stato IN ('attivo', 'trial')
  ORDER BY data_fine DESC NULLS LAST
  LIMIT 1;

  -- Se l'abbonamento ha una scadenza futura, usa quella; altrimenti immediata
  IF v_sub_data_fine IS NOT NULL AND v_sub_data_fine > NOW() THEN
    v_effettiva_il := v_sub_data_fine;
  ELSE
    v_effettiva_il := NOW();
  END IF;

  v_giorni := GREATEST(0, EXTRACT(DAY FROM v_effettiva_il - NOW())::INTEGER);

  UPDATE user_profiles
  SET
    cancellazione_richiesta_il = NOW(),
    cancellazione_effettiva_il = v_effettiva_il,
    cancellazione_motivo = p_motivo,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', TRUE,
    'cancellazione_effettiva_il', v_effettiva_il,
    'giorni_rimanenti', v_giorni
  );
END;
$$;

-- 4. RPC: Annulla richiesta di cancellazione
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_account_deletion(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET
    cancellazione_richiesta_il = NULL,
    cancellazione_effettiva_il = NULL,
    cancellazione_motivo = NULL,
    updated_at = NOW()
  WHERE id = p_user_id
    AND cancellazione_effettiva_il > NOW(); -- Solo se non ancora scaduta

  RETURN FOUND;
END;
$$;

-- 5. RPC: Aggiorna ultimo accesso (throttle 1 ora)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_ultimo_accesso(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET ultimo_accesso = NOW()
  WHERE id = p_user_id
    AND (ultimo_accesso IS NULL OR ultimo_accesso < NOW() - INTERVAL '1 hour');
END;
$$;

-- 6. RPC: Disattiva utenti con cancellazione effettiva scaduta
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_deletions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE user_profiles
  SET attivo = FALSE, updated_at = NOW()
  WHERE cancellazione_effettiva_il IS NOT NULL
    AND cancellazione_effettiva_il <= NOW()
    AND attivo = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 7. RPC: Controlla abbonamenti scaduti e blocca accesso
-- ============================================================================
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired INTEGER := 0;
  v_blocked INTEGER := 0;
BEGIN
  -- Marca abbonamenti scaduti
  UPDATE user_subscriptions
  SET stato = 'scaduto', updated_at = NOW()
  WHERE stato IN ('attivo', 'trial')
    AND data_fine IS NOT NULL
    AND data_fine < NOW();

  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Disattiva utenti con abbonamento scaduto/cancellato (non free, non admin/hpa)
  UPDATE user_profiles
  SET attivo = FALSE, updated_at = NOW()
  WHERE id IN (
    SELECT us.user_id FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.stato IN ('scaduto', 'cancellato')
      AND sp.is_free = FALSE
  )
  AND attivo = TRUE
  AND ruolo_livello NOT IN ('admin', 'hpa');

  GET DIAGNOSTICS v_blocked = ROW_COUNT;

  RETURN v_expired + v_blocked;
END;
$$;

-- 8. RPC: Pulizia utenti inattivi da 5+ anni (GDPR)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_inactive_users_5years()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Marca per cancellazione con 30 giorni di preavviso
  UPDATE user_profiles
  SET
    cancellazione_richiesta_il = NOW(),
    cancellazione_effettiva_il = NOW() + INTERVAL '30 days',
    cancellazione_motivo = 'Inattivita superiore a 5 anni (GDPR)',
    updated_at = NOW()
  WHERE
    ultimo_accesso IS NOT NULL
    AND ultimo_accesso < NOW() - INTERVAL '5 years'
    AND cancellazione_richiesta_il IS NULL
    AND ruolo_livello NOT IN ('admin')
    AND attivo = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- FINE MIGRAZIONE
-- ============================================================================
