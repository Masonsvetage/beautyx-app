-- ============================================================
-- Aggiunge colonna `source` a registro_giornate e registro_pagamenti
-- Per distinguere dati manuali da dati bridgati da Koibox
-- Esegui in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE registro_giornate
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manuale';

ALTER TABLE registro_pagamenti
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manuale';

-- Estende i metodi di pagamento accettati (per Koibox: bizum, paypal)
ALTER TABLE registro_pagamenti
  DROP CONSTRAINT IF EXISTS registro_pagamenti_metodo_check;

ALTER TABLE registro_pagamenti
  ADD CONSTRAINT registro_pagamenti_metodo_check
  CHECK (metodo IN ('pos','contanti','satispay','bonifico','bizum','paypal','altro'));
