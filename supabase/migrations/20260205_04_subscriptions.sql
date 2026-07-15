-- =====================================================
-- Migration: Subscription Packages & Minutes System
-- Data: 2026-02-05
-- Descrizione: Sistema abbonamenti con pacchetti minuti e integrazione Stripe
-- =====================================================

-- 1. Tabella pacchetti abbonamento disponibili
CREATE TABLE IF NOT EXISTS subscription_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,
  minuti_inclusi INTEGER NOT NULL,
  prezzo_cents INTEGER NOT NULL, -- in centesimi (es: 4900 = 49.00€)
  prezzo_display VARCHAR(20) GENERATED ALWAYS AS (
    CASE
      WHEN prezzo_cents % 100 = 0 THEN (prezzo_cents / 100)::TEXT || '€'
      ELSE (prezzo_cents / 100.0)::TEXT || '€'
    END
  ) STORED,
  periodo VARCHAR(20) DEFAULT 'mensile' CHECK (periodo IN ('mensile', 'trimestrale', 'annuale', 'una_tantum')),
  max_durata_chiamata INTEGER DEFAULT 60, -- max minuti per singola call
  -- Stripe integration
  stripe_product_id VARCHAR(100),
  stripe_price_id VARCHAR(100),
  -- Metadata
  features JSONB DEFAULT '[]', -- lista features incluse
  ordine INTEGER DEFAULT 1,
  attivo BOOLEAN DEFAULT TRUE,
  popolare BOOLEAN DEFAULT FALSE, -- evidenzia come "più popolare"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabella abbonamenti attivi per centro
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES subscription_packages(id),
  -- Date
  data_inizio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_scadenza DATE NOT NULL,
  -- Minuti
  minuti_totali INTEGER NOT NULL,
  minuti_usati INTEGER DEFAULT 0,
  minuti_rimanenti INTEGER GENERATED ALWAYS AS (GREATEST(minuti_totali - minuti_usati, 0)) STORED,
  -- Stato
  stato VARCHAR(20) DEFAULT 'attivo' CHECK (stato IN ('attivo', 'scaduto', 'sospeso', 'cancellato')),
  rinnovo_automatico BOOLEAN DEFAULT TRUE,
  -- Stripe integration
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  stripe_current_period_end TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un solo abbonamento attivo per centro
  CONSTRAINT unique_active_subscription UNIQUE(centro_id) -- removed WHERE clause, handled by application
);

-- 3. Tabella transazioni minuti (storico consumo/crediti)
CREATE TABLE IF NOT EXISTS minute_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES client_subscriptions(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES hpa_appointments(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('consumo', 'rimborso', 'bonus', 'scadenza', 'acquisto')),
  minuti INTEGER NOT NULL, -- positivo = aggiunto, negativo = consumato
  saldo_precedente INTEGER NOT NULL,
  saldo_nuovo INTEGER NOT NULL,
  descrizione TEXT,
  -- Metadata per audit
  eseguito_da UUID REFERENCES user_profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indici per performance
CREATE INDEX IF NOT EXISTS idx_packages_active ON subscription_packages(attivo, ordine) WHERE attivo = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_centro ON client_subscriptions(centro_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON client_subscriptions(stato, data_scadenza) WHERE stato = 'attivo';
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON client_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_minute_transactions_sub ON minute_transactions(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_minute_transactions_appointment ON minute_transactions(appointment_id) WHERE appointment_id IS NOT NULL;

-- 5. RLS Policies per packages (visibili a tutti)
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages" ON subscription_packages
  FOR SELECT TO authenticated
  USING (attivo = TRUE);

CREATE POLICY "Admin can manage packages" ON subscription_packages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

-- 6. RLS Policies per subscriptions
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all subscriptions" ON client_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

CREATE POLICY "HPA can view assigned center subscriptions" ON client_subscriptions
  FOR SELECT TO authenticated
  USING (
    centro_id IN (
      SELECT hca.centro_id FROM hpa_centro_assignments hca
      WHERE hca.hpa_id = auth.uid()
      AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
    )
  );

CREATE POLICY "Client can view own subscription" ON client_subscriptions
  FOR SELECT TO authenticated
  USING (
    centro_id IN (SELECT up.centro_id FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 7. RLS Policies per transactions
ALTER TABLE minute_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all transactions" ON minute_transactions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

CREATE POLICY "Users can view own center transactions" ON minute_transactions
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT cs.id FROM client_subscriptions cs
      JOIN user_profiles up ON up.centro_id = cs.centro_id
      WHERE up.id = auth.uid()
    )
  );

-- 8. Funzione per consumare minuti da un appuntamento
CREATE OR REPLACE FUNCTION consume_appointment_minutes(
  p_appointment_id UUID,
  p_minuti_effettivi INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_appointment hpa_appointments%ROWTYPE;
  v_subscription client_subscriptions%ROWTYPE;
  v_minuti_da_consumare INTEGER;
BEGIN
  -- Ottieni appuntamento
  SELECT * INTO v_appointment FROM hpa_appointments WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appuntamento non trovato';
  END IF;

  -- Usa minuti effettivi se forniti, altrimenti durata prenotata
  v_minuti_da_consumare := COALESCE(p_minuti_effettivi, v_appointment.durata_minuti);

  -- Ottieni abbonamento attivo del centro
  SELECT * INTO v_subscription
  FROM client_subscriptions
  WHERE centro_id = v_appointment.centro_id
  AND stato = 'attivo'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nessun abbonamento attivo per questo centro';
  END IF;

  -- Verifica minuti disponibili
  IF v_subscription.minuti_rimanenti < v_minuti_da_consumare THEN
    RAISE EXCEPTION 'Minuti insufficienti (disponibili: %, richiesti: %)',
      v_subscription.minuti_rimanenti, v_minuti_da_consumare;
  END IF;

  -- Aggiorna abbonamento
  UPDATE client_subscriptions
  SET minuti_usati = minuti_usati + v_minuti_da_consumare,
      updated_at = NOW()
  WHERE id = v_subscription.id;

  -- Registra transazione
  INSERT INTO minute_transactions (
    subscription_id, appointment_id, tipo, minuti,
    saldo_precedente, saldo_nuovo, descrizione
  ) VALUES (
    v_subscription.id,
    p_appointment_id,
    'consumo',
    -v_minuti_da_consumare,
    v_subscription.minuti_rimanenti,
    v_subscription.minuti_rimanenti - v_minuti_da_consumare,
    'Consumo per appuntamento del ' || v_appointment.data_appuntamento::TEXT
  );

  -- Aggiorna appuntamento
  UPDATE hpa_appointments
  SET minuti_consumati = v_minuti_da_consumare,
      stato = 'completato',
      updated_at = NOW()
  WHERE id = p_appointment_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Funzione per aggiungere minuti bonus
CREATE OR REPLACE FUNCTION add_bonus_minutes(
  p_centro_id UUID,
  p_minuti INTEGER,
  p_descrizione TEXT DEFAULT 'Minuti bonus'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription client_subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_subscription
  FROM client_subscriptions
  WHERE centro_id = p_centro_id AND stato = 'attivo'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nessun abbonamento attivo';
  END IF;

  UPDATE client_subscriptions
  SET minuti_totali = minuti_totali + p_minuti,
      updated_at = NOW()
  WHERE id = v_subscription.id;

  INSERT INTO minute_transactions (
    subscription_id, tipo, minuti, saldo_precedente, saldo_nuovo, descrizione
  ) VALUES (
    v_subscription.id, 'bonus', p_minuti,
    v_subscription.minuti_rimanenti,
    v_subscription.minuti_rimanenti + p_minuti,
    p_descrizione
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Funzione per ottenere saldo minuti
CREATE OR REPLACE FUNCTION get_minute_balance(p_centro_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  package_nome TEXT,
  minuti_totali INTEGER,
  minuti_usati INTEGER,
  minuti_rimanenti INTEGER,
  data_scadenza DATE,
  stato TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id as subscription_id,
    sp.nome as package_nome,
    cs.minuti_totali,
    cs.minuti_usati,
    cs.minuti_rimanenti,
    cs.data_scadenza,
    cs.stato::TEXT
  FROM client_subscriptions cs
  JOIN subscription_packages sp ON sp.id = cs.package_id
  WHERE cs.centro_id = p_centro_id
  ORDER BY cs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Trigger per aggiornare timestamp
DROP TRIGGER IF EXISTS trigger_packages_updated ON subscription_packages;
CREATE TRIGGER trigger_packages_updated
  BEFORE UPDATE ON subscription_packages
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_subscriptions_updated ON client_subscriptions;
CREATE TRIGGER trigger_subscriptions_updated
  BEFORE UPDATE ON client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 12. Inserisci pacchetti di default
INSERT INTO subscription_packages (nome, descrizione, minuti_inclusi, prezzo_cents, periodo, features, ordine, popolare)
VALUES
  ('Starter', 'Ideale per iniziare', 60, 2900, 'mensile',
   '["60 minuti di consulenza", "Chat illimitata", "Report mensile"]'::jsonb, 1, FALSE),
  ('Professional', 'Il più scelto', 120, 4900, 'mensile',
   '["120 minuti di consulenza", "Chat illimitata", "Report settimanale", "Priorità prenotazione"]'::jsonb, 2, TRUE),
  ('Enterprise', 'Per centri strutturati', 240, 8900, 'mensile',
   '["240 minuti di consulenza", "Chat illimitata", "Report personalizzati", "Account manager dedicato", "Formazione team"]'::jsonb, 3, FALSE)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE subscription_packages IS 'Pacchetti abbonamento con minuti inclusi';
COMMENT ON TABLE client_subscriptions IS 'Abbonamenti attivi dei centri estetici';
COMMENT ON TABLE minute_transactions IS 'Storico movimenti minuti (consumo, bonus, rimborsi)';
COMMENT ON FUNCTION consume_appointment_minutes IS 'Consuma minuti al completamento di un appuntamento';
COMMENT ON FUNCTION add_bonus_minutes IS 'Aggiunge minuti bonus a un abbonamento';
