-- =====================================================
-- Migration: Sistema Abbonamenti Completo
-- Data: 2026-02-11
-- Descrizione: Catalogo piani, sottoscrizioni utente, addon,
--              campagne sconto, acquisti, tracking utilizzo AI
-- =====================================================

-- =====================================================
-- 1. TABELLA subscription_plans (catalogo piani)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codice TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descrizione TEXT,

  -- Prezzi
  prezzo_mensile DECIMAL(10,2) NOT NULL DEFAULT 0,
  prezzo_annuale DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Limiti risorse (0 = illimitato)
  token_ai_mensili INTEGER NOT NULL DEFAULT 0,
  ore_hpa_mensili DECIMAL(5,1) NOT NULL DEFAULT 0,
  centri_max INTEGER NOT NULL DEFAULT 1,
  utenti_max INTEGER NOT NULL DEFAULT 1,

  -- Funzionalita abilitate
  funzionalita TEXT[] NOT NULL DEFAULT '{}',

  -- Integrazione Stripe
  stripe_product_id TEXT,
  stripe_price_id_mensile TEXT,
  stripe_price_id_annuale TEXT,

  -- Flags piano
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  is_trial BOOLEAN NOT NULL DEFAULT FALSE,
  durata_trial_giorni INTEGER NOT NULL DEFAULT 30,

  -- Ordinamento e stato
  ordine INTEGER NOT NULL DEFAULT 0,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_plans IS 'Catalogo dei piani di abbonamento disponibili';
COMMENT ON COLUMN subscription_plans.token_ai_mensili IS '0 = token illimitati';
COMMENT ON COLUMN subscription_plans.centri_max IS '0 = centri illimitati';
COMMENT ON COLUMN subscription_plans.utenti_max IS '0 = utenti illimitati';
COMMENT ON COLUMN subscription_plans.funzionalita IS 'Array di codici funzionalita abilitate dal piano';
-- =====================================================
-- 2. POPOLAMENTO 5 PIANI DEFAULT
-- =====================================================
INSERT INTO subscription_plans (
  codice, nome, descrizione,
  prezzo_mensile, prezzo_annuale,
  token_ai_mensili, ore_hpa_mensili,
  centri_max, utenti_max,
  funzionalita,
  is_free, is_trial, durata_trial_giorni,
  ordine
) VALUES
  -- Piano Free
  (
    'free',
    'Free',
    'Piano gratuito con funzionalita base per provare la piattaforma',
    0, 0,
    5000, 0,
    1, 1,
    ARRAY['dashboard','movimenti'],
    TRUE, FALSE, 0,
    1
  ),
  -- Piano Demo (trial)
  (
    'demo',
    'Demo',
    'Prova gratuita di 30 giorni con accesso alle funzionalita principali',
    0, 0,
    50000, 2.0,
    1, 2,
    ARRAY['dashboard','movimenti','analytics_base','pianificazione','obiettivi'],
    FALSE, TRUE, 30,
    2
  ),
  -- Piano Base
  (
    'base',
    'Base',
    'Piano ideale per centri estetici singoli con esigenze standard',
    29, 290,
    100000, 5.0,
    1, 3,
    ARRAY['dashboard','movimenti','analytics_base','pianificazione','obiettivi','budget','report_pdf'],
    FALSE, FALSE, 0,
    3
  ),
  -- Piano Pro
  (
    'pro',
    'Pro',
    'Piano avanzato per gestire piu centri con analytics e ottimizzazione',
    59, 590,
    500000, 15.0,
    3, 10,
    ARRAY['dashboard','movimenti','analytics_base','analytics_avanzate','pianificazione','obiettivi','budget','report_pdf','piani_ottimizzazione'],
    FALSE, FALSE, 0,
    4
  ),
  -- Piano Advanced
  (
    'advanced',
    'Advanced',
    'Piano completo senza limiti con tutte le funzionalita incluse e benchmark',
    99, 990,
    0, 30.0,
    0, 0,
    ARRAY['dashboard','movimenti','analytics_base','analytics_avanzate','pianificazione','obiettivi','budget','report_pdf','piani_ottimizzazione','benchmark'],
    FALSE, FALSE, 0,
    5
  )
ON CONFLICT (codice) DO UPDATE SET
  nome = EXCLUDED.nome,
  descrizione = EXCLUDED.descrizione,
  prezzo_mensile = EXCLUDED.prezzo_mensile,
  prezzo_annuale = EXCLUDED.prezzo_annuale,
  token_ai_mensili = EXCLUDED.token_ai_mensili,
  ore_hpa_mensili = EXCLUDED.ore_hpa_mensili,
  centri_max = EXCLUDED.centri_max,
  utenti_max = EXCLUDED.utenti_max,
  funzionalita = EXCLUDED.funzionalita,
  is_free = EXCLUDED.is_free,
  is_trial = EXCLUDED.is_trial,
  durata_trial_giorni = EXCLUDED.durata_trial_giorni,
  ordine = EXCLUDED.ordine;

-- =====================================================
-- 3. TABELLA user_subscriptions (abbonamento attivo utente)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo','trial','scaduto','sospeso','cancellato')),
  periodo TEXT DEFAULT 'mensile' CHECK (periodo IN ('mensile','annuale')),

  data_inizio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fine TIMESTAMPTZ,
  data_prossimo_rinnovo TIMESTAMPTZ,

  -- Contatori mese corrente
  token_ai_usati INTEGER NOT NULL DEFAULT 0,
  ore_hpa_usate DECIMAL(5,1) NOT NULL DEFAULT 0,
  mese_conteggio TEXT,

  -- Stripe
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  -- Admin override
  assegnato_da_admin BOOLEAN NOT NULL DEFAULT FALSE,
  admin_assegnante_id UUID REFERENCES user_profiles(id),
  note_admin TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stato ON user_subscriptions(stato);

-- =====================================================
-- 4. TABELLA addon_packages (pacchetti aggiuntivi)
-- =====================================================
CREATE TABLE IF NOT EXISTS addon_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codice TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descrizione TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('token_ai','ore_hpa','upgrade_temporaneo')),

  token_ai_bonus INTEGER NOT NULL DEFAULT 0,
  ore_hpa_bonus DECIMAL(5,1) NOT NULL DEFAULT 0,
  piano_upgrade_codice TEXT,
  durata_giorni INTEGER NOT NULL DEFAULT 30,

  prezzo DECIMAL(10,2) NOT NULL,
  prezzo_originale DECIMAL(10,2),

  stripe_product_id TEXT,
  stripe_price_id TEXT,

  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  ordine INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. TABELLA discount_campaigns (campagne sconto)
-- =====================================================
CREATE TABLE IF NOT EXISTS discount_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descrizione TEXT,

  tipo_sconto TEXT NOT NULL CHECK (tipo_sconto IN ('percentuale','fisso','prezzo_speciale')),
  valore_sconto DECIMAL(10,2) NOT NULL,

  addon_package_id UUID REFERENCES addon_packages(id),
  plan_id UUID REFERENCES subscription_plans(id),

  codice_promo TEXT UNIQUE,

  data_inizio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fine TIMESTAMPTZ,
  limite_utilizzi INTEGER,
  utilizzi_correnti INTEGER NOT NULL DEFAULT 0,

  target_tipo TEXT NOT NULL DEFAULT 'tutti' CHECK (target_tipo IN ('tutti','piano_specifico','ruolo_specifico')),
  target_valore TEXT,

  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_campaigns_attivo ON discount_campaigns(attivo);
CREATE INDEX IF NOT EXISTS idx_discount_campaigns_codice_promo ON discount_campaigns(codice_promo);

-- =====================================================
-- 6. TABELLA user_purchases (storico acquisti)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('abbonamento','addon','upgrade')),
  plan_id UUID REFERENCES subscription_plans(id),
  addon_package_id UUID REFERENCES addon_packages(id),
  campaign_id UUID REFERENCES discount_campaigns(id),

  importo DECIMAL(10,2) NOT NULL,
  importo_originale DECIMAL(10,2),
  sconto_applicato DECIMAL(10,2) NOT NULL DEFAULT 0,

  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,

  stato TEXT NOT NULL DEFAULT 'completato' CHECK (stato IN ('completato','pending','fallito','rimborsato')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);

-- =====================================================
-- 7. TABELLA ai_usage_log (log consumo token AI)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  centro_id UUID REFERENCES beauty_centers(id),
  conversation_id UUID,
  token_input INTEGER NOT NULL DEFAULT 0,
  token_output INTEGER NOT NULL DEFAULT 0,
  token_totali INTEGER NOT NULL DEFAULT 0,
  modello TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON ai_usage_log(created_at);

-- =====================================================
-- 8. FUNZIONI SQL
-- =====================================================

-- Recupera abbonamento utente con dettagli piano e consumo
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
      'hpa_percentage', CASE WHEN sp.ore_hpa_mensili = 0 THEN 0 ELSE ROUND((us.ore_hpa_usate / sp.ore_hpa_mensili) * 100, 1) END,
      'token_remaining', CASE WHEN sp.token_ai_mensili = 0 THEN -1 ELSE sp.token_ai_mensili - us.token_ai_usati END,
      'hpa_remaining', CASE WHEN sp.ore_hpa_mensili = 0 THEN -1 ELSE sp.ore_hpa_mensili - us.ore_hpa_usate END
    )
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"subscription": null, "plan": null, "usage": null}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Traccia consumo token AI
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
  result JSON;
BEGIN
  total_tokens := p_tokens_in + p_tokens_out;
  current_month := to_char(NOW(), 'YYYY-MM');

  INSERT INTO ai_usage_log (user_id, centro_id, conversation_id, token_input, token_output, token_totali, modello)
  VALUES (p_user_id, p_centro_id, p_conversation_id, p_tokens_in, p_tokens_out, total_tokens, p_model);

  UPDATE user_subscriptions
  SET
    token_ai_usati = CASE WHEN mese_conteggio = current_month THEN token_ai_usati + total_tokens ELSE total_tokens END,
    mese_conteggio = current_month,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  SELECT json_build_object(
    'token_ai_usati', us.token_ai_usati,
    'token_ai_mensili', sp.token_ai_mensili,
    'limit_reached', CASE WHEN sp.token_ai_mensili = 0 THEN FALSE ELSE us.token_ai_usati >= sp.token_ai_mensili END
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"token_ai_usati": 0, "token_ai_mensili": 0, "limit_reached": false}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Controlla limite token AI
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
    'token_ai_usati', us.token_ai_usati,
    'token_ai_mensili', sp.token_ai_mensili,
    'piano', sp.codice,
    'stato', us.stato,
    'percentage', CASE WHEN sp.token_ai_mensili = 0 THEN 0 ELSE ROUND((us.token_ai_usati::DECIMAL / sp.token_ai_mensili) * 100, 1) END
  ) INTO result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;

  RETURN COALESCE(result, '{"allowed": true, "token_ai_usati": 0, "token_ai_mensili": 0, "piano": "none", "stato": "none", "percentage": 0}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset contatori mensili
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS INTEGER AS $$
DECLARE
  current_month TEXT;
  updated_count INTEGER;
BEGIN
  current_month := to_char(NOW(), 'YYYY-MM');
  UPDATE user_subscriptions
  SET token_ai_usati = 0, ore_hpa_usate = 0, mese_conteggio = current_month, updated_at = NOW()
  WHERE mese_conteggio IS DISTINCT FROM current_month;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overview admin abbonamenti
CREATE OR REPLACE FUNCTION get_admin_subscription_overview()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totale_utenti', (SELECT COUNT(*) FROM user_profiles),
    'utenti_con_abbonamento', (SELECT COUNT(*) FROM user_subscriptions),
    'utenti_attivi', (SELECT COUNT(*) FROM user_subscriptions WHERE stato = 'attivo'),
    'utenti_trial', (SELECT COUNT(*) FROM user_subscriptions WHERE stato = 'trial'),
    'utenti_scaduti', (SELECT COUNT(*) FROM user_subscriptions WHERE stato = 'scaduto'),
    'utenti_sospesi', (SELECT COUNT(*) FROM user_subscriptions WHERE stato = 'sospeso'),
    'per_piano', (
      SELECT json_agg(json_build_object('codice', sp.codice, 'nome', sp.nome, 'count', COALESCE(sub.cnt, 0)))
      FROM subscription_plans sp
      LEFT JOIN (SELECT plan_id, COUNT(*) as cnt FROM user_subscriptions WHERE stato IN ('attivo','trial') GROUP BY plan_id) sub ON sub.plan_id = sp.id
      WHERE sp.attivo = TRUE
    ),
    'mrr', (
      SELECT COALESCE(SUM(CASE WHEN us.periodo = 'annuale' THEN sp.prezzo_annuale / 12 ELSE sp.prezzo_mensile END), 0)
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.stato = 'attivo' AND sp.is_free = FALSE AND sp.is_trial = FALSE
    ),
    'token_consumati_mese', (SELECT COALESCE(SUM(token_ai_usati), 0) FROM user_subscriptions),
    'campagne_attive', (SELECT COUNT(*) FROM discount_campaigns WHERE attivo = TRUE AND (data_fine IS NULL OR data_fine > NOW()))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RLS (Row Level Security)
-- =====================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Piani visibili a utenti autenticati" ON subscription_plans;
CREATE POLICY "Piani visibili a utenti autenticati" ON subscription_plans FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Utente vede proprio abbonamento" ON user_subscriptions;
CREATE POLICY "Utente vede proprio abbonamento" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE addon_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Addon visibili a utenti autenticati" ON addon_packages;
CREATE POLICY "Addon visibili a utenti autenticati" ON addon_packages FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE discount_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campagne attive visibili a utenti autenticati" ON discount_campaigns;
CREATE POLICY "Campagne attive visibili a utenti autenticati" ON discount_campaigns FOR SELECT USING (auth.role() = 'authenticated' AND attivo = TRUE);

ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Utente vede propri acquisti" ON user_purchases;
CREATE POLICY "Utente vede propri acquisti" ON user_purchases FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Utente vede propri log AI" ON ai_usage_log;
CREATE POLICY "Utente vede propri log AI" ON ai_usage_log FOR SELECT USING (auth.uid() = user_id);

SELECT 'Migration completata: sistema abbonamenti con 6 tabelle, 5 funzioni, RLS' as info;
