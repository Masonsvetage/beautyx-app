-- =====================================================
-- Allinea i piani abbonamento ai nuovi 4 piani landing
-- PREREQUISITO: 20260211_subscription_system.sql già eseguito
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- NOTA ARCHITETTURALE: token_ai_mensili ora memorizza TOKEN DI OUTPUT (non totali).
-- L'unità visibile all'utente è "caratteri": 1 token output ≈ 4 caratteri.
-- Limiti pensati per controllare i costi reali dell'API Claude:
--
--  Demo:         3.750 output token  ≈  15.000 caratteri/mese  ≈ ~15 risposte
--  Starter:     12.500 output token  ≈  50.000 caratteri/mese  ≈ ~50 risposte
--  Professional:37.500 output token  ≈ 150.000 caratteri/mese  ≈ ~150 risposte
--  Enterprise:  75.000 output token  ≈ 300.000 caratteri/mese  ≈ ~300 risposte
--
-- Costo stimato per piano (claude-sonnet-4 @ ~$0.02/richiesta):
--  Demo: ~$0.30/mese | Starter: ~$1/mese | Pro: ~$3/mese | Enterprise: ~$6/mese

INSERT INTO subscription_plans (
  codice, nome, descrizione,
  prezzo_mensile, prezzo_annuale,
  token_ai_mensili, ore_hpa_mensili,
  centri_max, utenti_max,
  funzionalita, is_free, is_trial, durata_trial_giorni, ordine
) VALUES
  (
    'demo',
    'Demo',
    'Piano gratuito di prova — 15.000 caratteri AI/mese, 30 min HPA (solo chat). Valido 60 giorni, non rinnovabile.',
    0, 0,
    3750,   -- ≈ 15.000 caratteri output/mese
    0.5,
    1, 1,
    ARRAY['dashboard','movimenti'],
    TRUE, TRUE, 60,
    1
  ),
  (
    'starter',
    'Starter',
    'Piano per centri singoli — 50.000 caratteri AI/mese, 60 min HPA (chat + audio)',
    79, 806,
    12500,  -- ≈ 50.000 caratteri output/mese
    1.0,
    1, 2,
    ARRAY['dashboard','movimenti','analytics_base','pianificazione','obiettivi','accantonamenti'],
    FALSE, FALSE, 0,
    2
  ),
  (
    'professional',
    'Professional',
    'Piano avanzato — 150.000 caratteri AI/mese, 180 min HPA (chat + audio + video)',
    149, 1520,
    37500,  -- ≈ 150.000 caratteri output/mese
    3.0,
    1, 5,
    ARRAY['dashboard','movimenti','analytics_base','analytics_avanzate','pianificazione','obiettivi','accantonamenti','budget','report_pdf','email_ai','piani_ottimizzazione'],
    FALSE, FALSE, 0,
    3
  ),
  (
    'enterprise',
    'Enterprise',
    'Piano multi-sede — 300.000 caratteri AI/mese per centro, 360 min HPA (HD)',
    299, 3050,
    75000,  -- ≈ 300.000 caratteri output/mese
    6.0,
    0, 0,
    ARRAY['dashboard','movimenti','analytics_base','analytics_avanzate','pianificazione','obiettivi','accantonamenti','budget','report_pdf','email_ai','piani_ottimizzazione','multi_centro','benchmark','api_dedicata'],
    FALSE, FALSE, 0,
    4
  )
ON CONFLICT (codice) DO UPDATE SET
  nome                  = EXCLUDED.nome,
  descrizione           = EXCLUDED.descrizione,
  prezzo_mensile        = EXCLUDED.prezzo_mensile,
  prezzo_annuale        = EXCLUDED.prezzo_annuale,
  token_ai_mensili      = EXCLUDED.token_ai_mensili,
  ore_hpa_mensili       = EXCLUDED.ore_hpa_mensili,
  centri_max            = EXCLUDED.centri_max,
  utenti_max            = EXCLUDED.utenti_max,
  funzionalita          = EXCLUDED.funzionalita,
  is_free               = EXCLUDED.is_free,
  is_trial              = EXCLUDED.is_trial,
  durata_trial_giorni   = EXCLUDED.durata_trial_giorni,
  ordine                = EXCLUDED.ordine;

-- =====================================================
-- Rimozione piani obsoleti (free, base, pro, advanced)
-- Prima migra gli utenti al piano equivalente nuovo,
-- poi elimina i vecchi piani dal catalogo.
-- Mapping: free→demo | base→starter | pro→professional | advanced→enterprise
-- =====================================================

-- Migra abbonamenti dai piani obsoleti ai nuovi equivalenti
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE codice = 'demo')
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE codice = 'free')
  AND EXISTS (SELECT 1 FROM subscription_plans WHERE codice = 'demo');

UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE codice = 'starter')
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE codice = 'base')
  AND EXISTS (SELECT 1 FROM subscription_plans WHERE codice = 'starter');

UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE codice = 'professional')
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE codice = 'pro')
  AND EXISTS (SELECT 1 FROM subscription_plans WHERE codice = 'professional');

UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE codice = 'enterprise')
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE codice = 'advanced')
  AND EXISTS (SELECT 1 FROM subscription_plans WHERE codice = 'enterprise');

-- Elimina piani obsoleti (sicuro: nessun utente vi fa più riferimento)
DELETE FROM subscription_plans WHERE codice IN ('free', 'base', 'pro', 'advanced');

-- Aggiorna track_ai_usage per contare SOLO token output (non input+output)
-- L'input è bounded dai dati del centro, il costo principale è l'output.
CREATE OR REPLACE FUNCTION track_ai_usage(
  p_user_id        UUID,
  p_centro_id      UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_tokens_in      INTEGER DEFAULT 0,
  p_tokens_out     INTEGER DEFAULT 0,
  p_model          TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_month TEXT;
  result JSON;
BEGIN
  current_month := to_char(NOW(), 'YYYY-MM');

  -- Log dettagliato (manteniamo sia in che out nel log)
  INSERT INTO ai_usage_log
    (user_id, centro_id, conversation_id, token_input, token_output, token_totali, modello)
  VALUES
    (p_user_id, p_centro_id, p_conversation_id, p_tokens_in, p_tokens_out, p_tokens_in + p_tokens_out, p_model);

  -- Contatore mensile: usa SOLO token output (costo visibile all'utente come caratteri)
  UPDATE user_subscriptions
  SET
    token_ai_usati = CASE
      WHEN mese_conteggio = current_month THEN token_ai_usati + p_tokens_out
      ELSE p_tokens_out
    END,
    mese_conteggio = current_month,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT json_build_object(
    'token_ai_usati',    us.token_ai_usati,
    'token_ai_mensili',  sp.token_ai_mensili,
    'caratteri_usati',   us.token_ai_usati * 4,
    'caratteri_mensili', sp.token_ai_mensili * 4,
    'limit_reached',     CASE
                           WHEN sp.token_ai_mensili = 0 THEN FALSE
                           ELSE us.token_ai_usati >= sp.token_ai_mensili
                         END
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"token_ai_usati":0,"token_ai_mensili":0,"caratteri_usati":0,"caratteri_mensili":0,"limit_reached":false}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggiorna check_ai_limit per restituire anche i caratteri
CREATE OR REPLACE FUNCTION check_ai_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'allowed', CASE
      WHEN sp.token_ai_mensili = 0 THEN TRUE
      WHEN us.stato NOT IN ('attivo','trial') THEN FALSE
      ELSE us.token_ai_usati < sp.token_ai_mensili
    END,
    'piano',             sp.codice,
    'stato',             us.stato,
    'token_ai_usati',    us.token_ai_usati,
    'token_ai_mensili',  sp.token_ai_mensili,
    'caratteri_usati',   us.token_ai_usati * 4,
    'caratteri_mensili', sp.token_ai_mensili * 4,
    'percentage',        CASE
                           WHEN sp.token_ai_mensili = 0 THEN 0
                           ELSE ROUND((us.token_ai_usati::DECIMAL / sp.token_ai_mensili) * 100, 1)
                         END
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"allowed":true,"piano":"none","stato":"none","token_ai_usati":0,"token_ai_mensili":0,"caratteri_usati":0,"caratteri_mensili":0,"percentage":0}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assegna piano Demo agli utenti senza abbonamento (con scadenza 60 giorni)
INSERT INTO user_subscriptions (user_id, plan_id, stato, periodo, data_inizio, data_fine, mese_conteggio)
SELECT
  up.id, sp.id, 'trial', 'mensile',
  NOW(),
  NOW() + INTERVAL '60 days',
  TO_CHAR(NOW(), 'YYYY-MM')
FROM user_profiles up
CROSS JOIN subscription_plans sp
WHERE sp.codice = 'demo'
  AND NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = up.id)
ON CONFLICT (user_id) DO NOTHING;

-- Verifica
SELECT
  sp.codice,
  sp.nome,
  sp.token_ai_mensili AS token_output_limit,
  sp.token_ai_mensili * 4 AS caratteri_mensili,
  sp.ore_hpa_mensili,
  sp.prezzo_mensile,
  COUNT(us.id) AS utenti
FROM subscription_plans sp
LEFT JOIN user_subscriptions us ON us.plan_id = sp.id AND us.stato IN ('attivo','trial')
WHERE sp.codice IN ('demo','starter','professional','enterprise')
GROUP BY sp.id, sp.codice, sp.nome, sp.token_ai_mensili, sp.ore_hpa_mensili, sp.prezzo_mensile
ORDER BY sp.ordine;
