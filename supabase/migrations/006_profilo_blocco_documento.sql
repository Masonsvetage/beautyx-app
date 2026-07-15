-- =====================================================
-- MIGRAZIONE 006: Sistema blocco profilo per documento scaduto
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- Campo per bloccare il profilo
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profilo_bloccato BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profilo_bloccato_motivo TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profilo_bloccato_data TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profilo_sbloccato_da UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profilo_sbloccato_data TIMESTAMPTZ;

-- Campo per tracciare se l'utente ha visto il warning del documento
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_warning_visto BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_warning_visto_data TIMESTAMPTZ;

-- Commenti
COMMENT ON COLUMN user_profiles.profilo_bloccato IS 'Se true, il profilo è bloccato e l''utente non può operare';
COMMENT ON COLUMN user_profiles.profilo_bloccato_motivo IS 'Motivo del blocco (es: documento_scaduto)';
COMMENT ON COLUMN user_profiles.profilo_bloccato_data IS 'Data in cui il profilo è stato bloccato';
COMMENT ON COLUMN user_profiles.profilo_sbloccato_da IS 'Admin che ha sbloccato il profilo';
COMMENT ON COLUMN user_profiles.profilo_sbloccato_data IS 'Data sblocco manuale';

-- Funzione per bloccare automaticamente profili con documento scaduto
-- (da eseguire periodicamente via cron job o Edge Function)
CREATE OR REPLACE FUNCTION check_and_block_expired_documents()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Blocca profili con documento scaduto (grace period di 0 giorni dalla scadenza)
  UPDATE user_profiles
  SET
    profilo_bloccato = TRUE,
    profilo_bloccato_motivo = 'documento_scaduto',
    profilo_bloccato_data = NOW()
  WHERE
    documento_data_scadenza IS NOT NULL
    AND documento_data_scadenza < CURRENT_DATE
    AND profilo_bloccato = FALSE
    AND ruolo_livello NOT IN ('admin'); -- Non bloccare admin

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Funzione per sbloccare un profilo (solo admin)
CREATE OR REPLACE FUNCTION sblocca_profilo(p_user_id UUID, p_admin_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica che chi sblocca sia admin
  IF NOT EXISTS(
    SELECT 1 FROM user_profiles
    WHERE id = p_admin_id AND ruolo_livello = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono sbloccare i profili';
  END IF;

  UPDATE user_profiles
  SET
    profilo_bloccato = FALSE,
    profilo_bloccato_motivo = NULL,
    profilo_bloccato_data = NULL,
    profilo_sbloccato_da = p_admin_id,
    profilo_sbloccato_data = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Funzione per ottenere stato documento
CREATE OR REPLACE FUNCTION get_documento_status(p_user_id UUID)
RETURNS TABLE (
  stato VARCHAR(20),
  giorni_alla_scadenza INTEGER,
  data_scadenza DATE,
  richiede_aggiornamento BOOLEAN,
  profilo_bloccato BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scadenza DATE;
  v_giorni INTEGER;
  v_bloccato BOOLEAN;
BEGIN
  SELECT
    up.documento_data_scadenza,
    up.profilo_bloccato
  INTO v_scadenza, v_bloccato
  FROM user_profiles up
  WHERE up.id = p_user_id;

  IF v_scadenza IS NULL THEN
    RETURN QUERY SELECT
      'non_inserito'::VARCHAR(20),
      NULL::INTEGER,
      NULL::DATE,
      TRUE,
      COALESCE(v_bloccato, FALSE);
  ELSE
    v_giorni := v_scadenza - CURRENT_DATE;

    IF v_giorni < 0 THEN
      RETURN QUERY SELECT
        'scaduto'::VARCHAR(20),
        v_giorni,
        v_scadenza,
        TRUE,
        COALESCE(v_bloccato, FALSE);
    ELSIF v_giorni <= 50 THEN
      RETURN QUERY SELECT
        'in_scadenza'::VARCHAR(20),
        v_giorni,
        v_scadenza,
        TRUE,
        COALESCE(v_bloccato, FALSE);
    ELSE
      RETURN QUERY SELECT
        'valido'::VARCHAR(20),
        v_giorni,
        v_scadenza,
        FALSE,
        COALESCE(v_bloccato, FALSE);
    END IF;
  END IF;
END;
$$;

SELECT 'Migrazione 006 completata!' as status;
