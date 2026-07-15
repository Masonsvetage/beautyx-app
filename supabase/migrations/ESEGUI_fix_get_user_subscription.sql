-- ============================================================
-- ESEGUI_fix_get_user_subscription.sql
-- Fix: get_user_subscription restituiva una riga casuale quando
-- l'utente aveva più sottoscrizioni (es. demo + professional).
-- La funzione ora prende sempre la sottoscrizione più recente
-- con stato attivo/trial, con fallback all'ultima in assoluto.
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'subscription', json_build_object(
      'id', us.id,
      'stato', us.stato,
      'periodo', us.periodo,
      'data_inizio', us.data_inizio,
      'data_fine', us.data_fine,
      'data_prossimo_rinnovo', us.data_prossimo_rinnovo,
      'token_ai_usati', us.token_ai_usati,
      'ore_hpa_usate', us.ore_hpa_usate,
      'mese_conteggio', us.mese_conteggio,
      'assegnato_da_admin', us.assegnato_da_admin,
      'note_admin', us.note_admin
    ),
    'plan', json_build_object(
      'id', sp.id,
      'codice', sp.codice,
      'nome', sp.nome,
      'descrizione', sp.descrizione,
      'prezzo_mensile', sp.prezzo_mensile,
      'prezzo_annuale', sp.prezzo_annuale,
      'token_ai_mensili', sp.token_ai_mensili,
      'ore_hpa_mensili', sp.ore_hpa_mensili,
      'centri_max', sp.centri_max,
      'utenti_max', sp.utenti_max,
      'funzionalita', sp.funzionalita,
      'is_free', sp.is_free,
      'is_trial', sp.is_trial
    ),
    'usage', json_build_object(
      'token_percentage', CASE WHEN sp.token_ai_mensili = 0 THEN 0 ELSE ROUND((us.token_ai_usati::DECIMAL / sp.token_ai_mensili) * 100, 1) END,
      'hpa_percentage',   CASE WHEN sp.ore_hpa_mensili  = 0 THEN 0 ELSE ROUND((us.ore_hpa_usate   / sp.ore_hpa_mensili)  * 100, 1) END,
      'token_remaining',  CASE WHEN sp.token_ai_mensili = 0 THEN -1 ELSE sp.token_ai_mensili - us.token_ai_usati END,
      'hpa_remaining',    CASE WHEN sp.ore_hpa_mensili  = 0 THEN -1 ELSE sp.ore_hpa_mensili  - us.ore_hpa_usate  END
    )
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
  -- Priorità: 1) assegnato da admin (override manuale)
  --           2) stato (attivo > trial > altri)
  --           3) più recente
  ORDER BY
    CASE WHEN us.assegnato_da_admin = true THEN 0 ELSE 1 END ASC,
    CASE us.stato
      WHEN 'attivo'     THEN 1
      WHEN 'trial'      THEN 2
      WHEN 'sospeso'    THEN 3
      WHEN 'scaduto'    THEN 4
      WHEN 'cancellato' THEN 5
      ELSE 6
    END ASC,
    us.created_at DESC
  LIMIT 1;

  RETURN COALESCE(result, '{"subscription": null, "plan": null, "usage": null}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
