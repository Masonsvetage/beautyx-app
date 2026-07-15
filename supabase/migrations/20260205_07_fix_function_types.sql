-- Fix type mismatch in get_inactive_users function
-- Il campo centro_nome deve essere castato a TEXT per matchare il return type

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
    bc.nome::TEXT as centro_nome,  -- Cast esplicito a TEXT
    up.email::TEXT,                 -- Cast esplicito a TEXT
    up.nome::TEXT,                  -- Cast esplicito a TEXT
    up.cognome::TEXT,               -- Cast esplicito a TEXT
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
