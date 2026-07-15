-- =====================================================
-- Esenzione Admin/HPA dai profili di abbonamento
-- Admin e HPA sono contrattualizzati o liberi professionisti
-- pagati a parcella: non alimentano i gruppi di abbonati.
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Rimuovi eventuali righe user_subscriptions per admin/HPA
--    (create per errore da vecchie migrazioni o dal trigger)
DELETE FROM user_subscriptions
WHERE user_id IN (
  SELECT id FROM user_profiles
  WHERE ruolo_livello IN ('admin', 'hpa')
);

-- 2. Azzera user_profiles.piano per admin/HPA
--    (non ha senso avere un piano assegnato)
UPDATE user_profiles
SET piano = NULL, updated_at = NOW()
WHERE ruolo_livello IN ('admin', 'hpa')
  AND piano IS NOT NULL;

-- 3. Aggiorna la funzione RPC get_admin_subscription_overview
--    per escludere admin/HPA dai conteggi abbonati
DROP FUNCTION IF EXISTS get_admin_subscription_overview();
CREATE OR REPLACE FUNCTION get_admin_subscription_overview()
RETURNS TABLE (
  totale_abbonati        BIGINT,
  abbonati_attivi        BIGINT,
  abbonati_trial         BIGINT,
  abbonati_scaduti       BIGINT,
  mrr                    NUMERIC,
  arr                    NUMERIC,
  per_piano              JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH subs AS (
    SELECT
      us.*,
      sp.codice      AS piano_codice,
      sp.nome        AS piano_nome,
      sp.prezzo_mensile,
      sp.prezzo_annuale,
      sp.is_free,
      sp.is_trial
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    -- Escludi admin e HPA: non sono abbonati commerciali
    WHERE us.user_id NOT IN (
      SELECT id FROM user_profiles WHERE ruolo_livello IN ('admin', 'hpa')
    )
  )
  SELECT
    COUNT(*)::BIGINT                                                         AS totale_abbonati,
    COUNT(*) FILTER (WHERE stato = 'attivo')::BIGINT                        AS abbonati_attivi,
    COUNT(*) FILTER (WHERE stato = 'trial')::BIGINT                         AS abbonati_trial,
    COUNT(*) FILTER (WHERE stato = 'scaduto'
                        OR (data_fine IS NOT NULL AND data_fine < NOW()))::BIGINT AS abbonati_scaduti,
    COALESCE(SUM(CASE WHEN stato = 'attivo' AND NOT is_free THEN prezzo_mensile ELSE 0 END), 0) AS mrr,
    COALESCE(SUM(CASE WHEN stato = 'attivo' AND NOT is_free THEN prezzo_mensile * 12 ELSE 0 END), 0) AS arr,
    (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          piano_codice AS codice,
          piano_nome   AS nome,
          COUNT(*)     AS count
        FROM subs
        GROUP BY piano_codice, piano_nome
        ORDER BY COUNT(*) DESC
      ) t
    )::JSON AS per_piano
  FROM subs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verifica: mostra admin/HPA senza abbonamento
SELECT
  up.email,
  up.nome,
  up.cognome,
  up.ruolo_livello,
  up.piano,
  us.id AS subscription_id
FROM user_profiles up
LEFT JOIN user_subscriptions us ON us.user_id = up.id
WHERE up.ruolo_livello IN ('admin', 'hpa')
ORDER BY up.ruolo_livello, up.email;

-- 5. Verifica: conteggi corretti senza admin/HPA
SELECT * FROM get_admin_subscription_overview();
