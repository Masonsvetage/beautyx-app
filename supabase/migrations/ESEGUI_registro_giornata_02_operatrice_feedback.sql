-- ============================================================
-- REGISTRO GIORNATA — aggiunta operatrice e feedback cliente
-- Aggiunge colonne a registro_pagamenti e registro_crediti
-- ============================================================

-- Operatrice e feedback su ogni incasso/pagamento
ALTER TABLE registro_pagamenti
  ADD COLUMN IF NOT EXISTS operatrice_nome  TEXT,
  ADD COLUMN IF NOT EXISTS feedback_tipo    TEXT CHECK (feedback_tipo IN ('positivo','negativo','interesse_acquisto','neutro')),
  ADD COLUMN IF NOT EXISTS feedback_testo   TEXT,
  ADD COLUMN IF NOT EXISTS interesse_futuro TEXT; -- servizio/prodotto che vorrebbe acquistare

-- Stessi campi sui crediti (il servizio è già stato erogato)
ALTER TABLE registro_crediti
  ADD COLUMN IF NOT EXISTS operatrice_nome  TEXT,
  ADD COLUMN IF NOT EXISTS feedback_tipo    TEXT CHECK (feedback_tipo IN ('positivo','negativo','interesse_acquisto','neutro')),
  ADD COLUMN IF NOT EXISTS feedback_testo   TEXT,
  ADD COLUMN IF NOT EXISTS interesse_futuro TEXT;

-- Index per recuperare facilmente i feedback di interesse (per future promozioni)
CREATE INDEX IF NOT EXISTS idx_reg_pagamenti_interesse ON registro_pagamenti(centro_id) WHERE interesse_futuro IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_crediti_interesse   ON registro_crediti(centro_id)   WHERE interesse_futuro IS NOT NULL;
