-- ============================================================
-- REGISTRO GIORNATA
-- Tabelle per: Giornate, Pagamenti, Spese, Crediti, Dettaglio Operatrici
-- Idempotente: DROP POLICY IF EXISTS prima di CREATE
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. REGISTRO_GIORNATE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_giornate (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id           UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  data                DATE NOT NULL,
  n_clienti           INTEGER NOT NULL DEFAULT 0,
  n_servizi           INTEGER NOT NULL DEFAULT 0,
  n_prodotti          INTEGER NOT NULL DEFAULT 0,
  incasso_effettivo   DECIMAL(10,2) NOT NULL DEFAULT 0,
  incasso_maturato    DECIMAL(10,2) NOT NULL DEFAULT 0,
  spese_totali        DECIMAL(10,2) NOT NULL DEFAULT 0,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(centro_id, data)
);

ALTER TABLE registro_giornate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registro_giornate_utente"  ON registro_giornate;
DROP POLICY IF EXISTS "registro_giornate_service" ON registro_giornate;
CREATE POLICY "registro_giornate_utente" ON registro_giornate
  FOR ALL USING (centro_id IN (SELECT centro_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "registro_giornate_service" ON registro_giornate
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 2. REGISTRO_PAGAMENTI
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_pagamenti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id       UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  giornata_id     UUID REFERENCES registro_giornate(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  metodo          TEXT NOT NULL DEFAULT 'contanti'
                  CHECK (metodo IN ('pos','contanti','satispay','bonifico','altro')),
  importo         DECIMAL(10,2) NOT NULL DEFAULT 0,
  descrizione     TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE registro_pagamenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registro_pagamenti_utente"  ON registro_pagamenti;
DROP POLICY IF EXISTS "registro_pagamenti_service" ON registro_pagamenti;
CREATE POLICY "registro_pagamenti_utente" ON registro_pagamenti
  FOR ALL USING (centro_id IN (SELECT centro_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "registro_pagamenti_service" ON registro_pagamenti
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 3. REGISTRO_SPESE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_spese (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id     UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  giornata_id   UUID REFERENCES registro_giornate(id) ON DELETE CASCADE,
  data          DATE NOT NULL,
  descrizione   TEXT NOT NULL,
  importo       DECIMAL(10,2) NOT NULL DEFAULT 0,
  categoria     TEXT NOT NULL DEFAULT 'altro'
                CHECK (categoria IN ('materiali','utenze','personale','affitto','marketing','altro')),
  metodo        TEXT DEFAULT 'contanti'
                CHECK (metodo IN ('pos','contanti','satispay','bonifico','altro')),
  fornitore     TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE registro_spese ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registro_spese_utente"  ON registro_spese;
DROP POLICY IF EXISTS "registro_spese_service" ON registro_spese;
CREATE POLICY "registro_spese_utente" ON registro_spese
  FOR ALL USING (centro_id IN (SELECT centro_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "registro_spese_service" ON registro_spese
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 4. REGISTRO_CREDITI
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_crediti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id        UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  giornata_id      UUID REFERENCES registro_giornate(id) ON DELETE SET NULL,
  data_servizio    DATE NOT NULL,
  nome_cliente     TEXT NOT NULL,
  servizio         TEXT,
  importo_totale   DECIMAL(10,2) NOT NULL DEFAULT 0,
  acconto_versato  DECIMAL(10,2) NOT NULL DEFAULT 0,
  residuo          DECIMAL(10,2) GENERATED ALWAYS AS (importo_totale - acconto_versato) STORED,
  metodo_acconto   TEXT DEFAULT 'contanti'
                   CHECK (metodo_acconto IN ('pos','contanti','satispay','bonifico','altro','nessuno')),
  data_attesa_saldo DATE,
  saldato          BOOLEAN NOT NULL DEFAULT false,
  saldato_il       DATE,
  metodo_saldo     TEXT CHECK (metodo_saldo IN ('pos','contanti','satispay','bonifico','altro')),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE registro_crediti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registro_crediti_utente"  ON registro_crediti;
DROP POLICY IF EXISTS "registro_crediti_service" ON registro_crediti;
CREATE POLICY "registro_crediti_utente" ON registro_crediti
  FOR ALL USING (centro_id IN (SELECT centro_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "registro_crediti_service" ON registro_crediti
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 5. REGISTRO_DETTAGLIO_OPERATRICI
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_dettaglio_operatrici (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id       UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  giornata_id     UUID REFERENCES registro_giornate(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  operatrice_nome TEXT NOT NULL,
  n_servizi       INTEGER NOT NULL DEFAULT 0,
  n_prodotti      INTEGER NOT NULL DEFAULT 0,
  incasso_stimato DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE registro_dettaglio_operatrici ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "registro_operatrici_utente"  ON registro_dettaglio_operatrici;
DROP POLICY IF EXISTS "registro_operatrici_service" ON registro_dettaglio_operatrici;
CREATE POLICY "registro_operatrici_utente" ON registro_dettaglio_operatrici
  FOR ALL USING (centro_id IN (SELECT centro_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY "registro_operatrici_service" ON registro_dettaglio_operatrici
  FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reg_giornate_centro_data   ON registro_giornate(centro_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_reg_pagamenti_centro_data  ON registro_pagamenti(centro_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_reg_spese_centro_data      ON registro_spese(centro_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_reg_crediti_centro_saldo   ON registro_crediti(centro_id, saldato, data_attesa_saldo);
CREATE INDEX IF NOT EXISTS idx_reg_crediti_scadenza       ON registro_crediti(centro_id, data_attesa_saldo) WHERE saldato = false;
CREATE INDEX IF NOT EXISTS idx_reg_dettaglio_giornata     ON registro_dettaglio_operatrici(giornata_id);
