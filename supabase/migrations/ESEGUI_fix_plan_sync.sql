-- =====================================================
-- Fix sincronizzazione piani e demo 60 giorni
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Crea righe user_subscriptions per utenti che ne sono privi
--    (creati tramite admin prima che la migration fosse eseguita)
INSERT INTO user_subscriptions (user_id, plan_id, stato, periodo, data_inizio, data_fine, mese_conteggio)
SELECT
  up.id,
  sp.id,
  'trial',
  'mensile',
  NOW(),
  NOW() + INTERVAL '60 days',
  TO_CHAR(NOW(), 'YYYY-MM')
FROM user_profiles up
CROSS JOIN subscription_plans sp
WHERE sp.codice = 'demo'
  AND up.ruolo_livello NOT IN ('admin', 'hpa')
  AND NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = up.id)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Sincronizza user_profiles.piano con il piano reale in user_subscriptions
--    (fonte di verità: user_subscriptions)
UPDATE user_profiles up
SET piano = sp.codice, updated_at = NOW()
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = up.id
  AND up.piano IS DISTINCT FROM sp.codice;

-- 3. Aggiorna piano Demo a 60 giorni non rinnovabili
UPDATE subscription_plans
SET durata_trial_giorni = 60,
    descrizione = 'Piano gratuito di prova — 15.000 caratteri AI/mese, 30 min HPA (solo chat). Valido 60 giorni, non rinnovabile.'
WHERE codice = 'demo';

-- 4. Imposta data_fine per utenti Demo che non ce l'hanno ancora
UPDATE user_subscriptions us
SET data_fine = COALESCE(us.data_inizio, NOW()) + INTERVAL '60 days',
    updated_at = NOW()
FROM subscription_plans sp
WHERE sp.id = us.plan_id
  AND sp.codice = 'demo'
  AND us.data_fine IS NULL;

-- 5. Verifica: mostra tutti gli utenti con il loro piano attuale
SELECT
  up.email,
  up.nome,
  up.cognome,
  up.piano AS piano_profilo,
  sp.codice AS piano_abbonamento,
  sp.nome AS nome_piano,
  us.stato,
  us.data_inizio::DATE AS inizio,
  us.data_fine::DATE AS scadenza,
  us.assegnato_da_admin
FROM user_profiles up
LEFT JOIN user_subscriptions us ON us.user_id = up.id
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
ORDER BY up.email;
