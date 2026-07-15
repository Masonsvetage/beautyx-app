-- =====================================================
-- Configurazione promo Early Adopter
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- Aggiunge i contatori per le due tier promozionali
INSERT INTO marketing_config (key, value, label, icona) VALUES
  ('early_free_spots',       '10', 'Early Adopter — Posti gratuiti totali (Tier 1)',      '👑'),
  ('early_free_taken',        '0', 'Early Adopter — Posti gratuiti occupati (Tier 1)',     null),
  ('early_discounted_spots', '50', 'Early Adopter — Posti scontati totali (Tier 2)',       '⭐'),
  ('early_discounted_taken',  '0', 'Early Adopter — Posti scontati occupati (Tier 2)',     null)
ON CONFLICT (key) DO NOTHING;

-- Verifica
SELECT key, value, label FROM marketing_config WHERE key LIKE 'early_%' ORDER BY key;
