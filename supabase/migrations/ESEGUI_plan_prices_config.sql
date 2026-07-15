-- =====================================================
-- Aggiunge prezzi dei piani a marketing_config
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

INSERT INTO marketing_config (key, value, label, icona) VALUES
  ('plan_demo_price',              'Gratuito',                                         'Piano Demo — Prezzo',              '🆓'),
  ('plan_demo_period',             '',                                                  'Piano Demo — Periodo',             null),
  ('plan_starter_price',           '€79',                                              'Piano Starter — Prezzo',           '🚀'),
  ('plan_starter_period',          '/mese',                                             'Piano Starter — Periodo',          null),
  ('plan_professional_price',      '€149',                                             'Piano Professional — Prezzo',      '⭐'),
  ('plan_professional_period',     '/mese',                                             'Piano Professional — Periodo',     null),
  ('plan_enterprise_price',        '€299',                                             'Piano Enterprise — Prezzo base',   '🏢'),
  ('plan_enterprise_period',       '/mese',                                             'Piano Enterprise — Periodo',       null),
  ('plan_enterprise_note',         '+ €49/mese per ogni centro aggiuntivo oltre il primo', 'Piano Enterprise — Nota prezzi', null)
ON CONFLICT (key) DO NOTHING;

SELECT key, value, label FROM marketing_config WHERE key LIKE 'plan_%' ORDER BY key;
