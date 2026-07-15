-- =====================================================
-- Disabilita i piani obsoleti senza cancellarli
-- (la DELETE fallisce per vincoli FK su user_subscriptions)
-- Aggiunge colonna "attivo" e marca i vecchi piani come inattivi
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Aggiungi colonna attivo se non esiste
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS attivo BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Marca i piani obsoleti come inattivi
UPDATE subscription_plans
SET attivo = FALSE
WHERE codice IN ('free', 'base', 'pro', 'advanced');

-- 3. Assicura che i nuovi piani siano attivi
UPDATE subscription_plans
SET attivo = TRUE
WHERE codice IN ('demo', 'starter', 'professional', 'enterprise');

-- 4. Verifica
SELECT codice, nome, attivo, prezzo_mensile, ordine
FROM subscription_plans
ORDER BY attivo DESC, ordine;
