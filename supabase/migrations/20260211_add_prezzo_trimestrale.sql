-- =====================================================
-- Migration: Aggiunta prezzo trimestrale ai piani
-- Data: 2026-02-11
-- =====================================================

-- Aggiunge colonna prezzo_trimestrale alla tabella subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS prezzo_trimestrale DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN subscription_plans.prezzo_trimestrale IS 'Prezzo per periodo trimestrale (0 = non disponibile)';

-- Aggiunge periodo trimestrale alla tabella user_subscriptions
-- Prima rimuovi il vincolo check esistente, poi ricrealo con il nuovo valore
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_periodo_check;
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_periodo_check
  CHECK (periodo IN ('mensile', 'trimestrale', 'annuale'));

SELECT 'Migration completata: aggiunto prezzo_trimestrale e periodo trimestrale' as info;
