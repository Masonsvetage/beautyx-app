-- =====================================================
-- Migration: Bonus Token Addon per user_subscriptions
-- Data: 2026-03-03
-- Descrizione: Aggiunge colonna token_ai_bonus e aggiorna
--              le funzioni RPC per gestire il pool bonus
-- =====================================================

-- 1. Aggiungi colonna token_ai_bonus a user_subscriptions
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS token_ai_bonus INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN user_subscriptions.token_ai_bonus IS
  'Pool di token aggiuntivi acquistati. Decrementato man mano che vengono usati, non si resetta mensilmente.';

-- =====================================================
-- 2. Aggiorna check_ai_limit
--    Limite effettivo = plan.token_ai_mensili + us.token_ai_bonus
-- =====================================================
CREATE OR REPLACE FUNCTION check_ai_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'allowed', CASE
      WHEN sp.token_ai_mensili = 0 THEN TRUE
      WHEN us.stato NOT IN ('attivo','trial') THEN FALSE
      ELSE us.token_ai_usati < (sp.token_ai_mensili + us.token_ai_bonus)
    END,
    'token_ai_usati', us.token_ai_usati,
    'token_ai_mensili', sp.token_ai_mensili + us.token_ai_bonus,
    'token_ai_piano', sp.token_ai_mensili,
    'token_ai_bonus', us.token_ai_bonus,
    'piano', sp.codice,
    'stato', us.stato,
    'percentage', CASE
      WHEN (sp.token_ai_mensili + us.token_ai_bonus) = 0 THEN 0
      ELSE ROUND((us.token_ai_usati::DECIMAL / (sp.token_ai_mensili + us.token_ai_bonus)) * 100, 1)
    END
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"allowed": true, "token_ai_usati": 0, "token_ai_mensili": 0, "token_ai_bonus": 0, "piano": "none", "stato": "none", "percentage": 0}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Aggiorna track_ai_usage
--    Drena dal bonus pool quando si supera il limite del piano
-- =====================================================
CREATE OR REPLACE FUNCTION track_ai_usage(
  p_user_id UUID,
  p_centro_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_tokens_in INTEGER DEFAULT 0,
  p_tokens_out INTEGER DEFAULT 0,
  p_model TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  total_tokens INTEGER;
  current_month TEXT;
  plan_tokens INTEGER;
  new_usati INTEGER;
  excess INTEGER;
  result JSON;
BEGIN
  total_tokens := p_tokens_in + p_tokens_out;
  current_month := to_char(NOW(), 'YYYY-MM');

  -- Ottieni limite piano corrente
  SELECT sp.token_ai_mensili INTO plan_tokens
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  -- Log utilizzo
  INSERT INTO ai_usage_log (user_id, centro_id, conversation_id, token_input, token_output, token_totali, modello)
  VALUES (p_user_id, p_centro_id, p_conversation_id, p_tokens_in, p_tokens_out, total_tokens, p_model);

  -- Aggiorna contatore mensile, ritorna nuovo valore
  UPDATE user_subscriptions
  SET
    token_ai_usati = CASE
      WHEN mese_conteggio = current_month THEN token_ai_usati + total_tokens
      ELSE total_tokens
    END,
    mese_conteggio = current_month,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING token_ai_usati INTO new_usati;

  -- Se il piano ha un limite e lo abbiamo superato, drena dal bonus pool
  -- Dreniamo solo la quota di QUESTO call che è andata in territorio bonus
  IF plan_tokens > 0 AND new_usati > plan_tokens THEN
    excess := LEAST(total_tokens, new_usati - plan_tokens);
    UPDATE user_subscriptions
    SET token_ai_bonus = GREATEST(0, token_ai_bonus - excess)
    WHERE user_id = p_user_id;
  END IF;

  -- Ritorna stato aggiornato
  SELECT json_build_object(
    'token_ai_usati', us.token_ai_usati,
    'token_ai_mensili', sp.token_ai_mensili + us.token_ai_bonus,
    'token_ai_bonus', us.token_ai_bonus,
    'limit_reached', CASE
      WHEN sp.token_ai_mensili = 0 THEN FALSE
      ELSE us.token_ai_usati >= (sp.token_ai_mensili + us.token_ai_bonus)
    END
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"token_ai_usati": 0, "token_ai_mensili": 0, "token_ai_bonus": 0, "limit_reached": false}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Aggiorna get_user_subscription
--    Ritorna il limite effettivo (piano + bonus) e il bonus separato
-- =====================================================
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
      'token_ai_bonus', us.token_ai_bonus,
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
      'token_ai_mensili', sp.token_ai_mensili + us.token_ai_bonus,
      'token_ai_piano', sp.token_ai_mensili,
      'ore_hpa_mensili', sp.ore_hpa_mensili,
      'centri_max', sp.centri_max,
      'utenti_max', sp.utenti_max,
      'funzionalita', sp.funzionalita,
      'is_free', sp.is_free,
      'is_trial', sp.is_trial
    ),
    'usage', json_build_object(
      'token_percentage', CASE
        WHEN (sp.token_ai_mensili + us.token_ai_bonus) = 0 THEN 0
        ELSE ROUND((us.token_ai_usati::DECIMAL / (sp.token_ai_mensili + us.token_ai_bonus)) * 100, 1)
      END,
      'hpa_percentage', CASE
        WHEN sp.ore_hpa_mensili = 0 THEN 0
        ELSE ROUND((us.ore_hpa_usate / sp.ore_hpa_mensili) * 100, 1)
      END,
      'token_remaining', CASE
        WHEN sp.token_ai_mensili = 0 THEN -1
        ELSE (sp.token_ai_mensili + us.token_ai_bonus) - us.token_ai_usati
      END,
      'hpa_remaining', CASE
        WHEN sp.ore_hpa_mensili = 0 THEN -1
        ELSE sp.ore_hpa_mensili - us.ore_hpa_usate
      END
    )
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"subscription": null, "plan": null, "usage": null}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration completata: token_ai_bonus aggiunto a user_subscriptions, RPC aggiornate' AS info;
