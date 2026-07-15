-- ===================================================================
-- FIX: Crea accantonamenti SENZA foreign key (per debug)
-- Se beauty_centers non esiste, questo script funzionerà comunque
-- ===================================================================

-- STEP 1: Crea tabella accantonamenti SENZA FK (temporaneo)
-- ===================================================================
CREATE TABLE IF NOT EXISTS accantonamenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL,  -- RIMOSSO: REFERENCES beauty_centers(id)
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,
  importo_obiettivo DECIMAL(10,2) DEFAULT 0,
  saldo_attuale DECIMAL(10,2) DEFAULT 0,
  contributo_mensile DECIMAL(10,2) DEFAULT 0,
  tipo_versamento VARCHAR(30) DEFAULT 'manuale'
    CHECK (tipo_versamento IN ('fisso_mensile', 'percentuale_incasso', 'manuale')),
  percentuale_incasso DECIMAL(5,2) DEFAULT 0
    CHECK (percentuale_incasso >= 0 AND percentuale_incasso <= 100),
  colore VARCHAR(7) DEFAULT '#8b5cf6',
  icona VARCHAR(10) DEFAULT '💰',
  categoria_collegata VARCHAR(100),
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, nome)
);

-- STEP 2: Crea tabella accantonamento_movements
-- ===================================================================
CREATE TABLE IF NOT EXISTS accantonamento_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accantonamento_id UUID NOT NULL REFERENCES accantonamenti(id) ON DELETE CASCADE,
  bank_movement_id UUID,  -- RIMOSSO: REFERENCES bank_movements(id)
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'trasferimento')),
  importo DECIMAL(10,2) NOT NULL,
  descrizione TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- STEP 3: Indici
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_accantonamenti_centro ON accantonamenti(centro_id);
CREATE INDEX IF NOT EXISTS idx_accantonamenti_attivo ON accantonamenti(attivo);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_acc_id ON accantonamento_movements(accantonamento_id);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_data ON accantonamento_movements(data);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_bank_id ON accantonamento_movements(bank_movement_id);

-- STEP 4: Function e Trigger per updated_at
-- ===================================================================
CREATE OR REPLACE FUNCTION update_accantonamenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accantonamenti_updated_at ON accantonamenti;
CREATE TRIGGER accantonamenti_updated_at
BEFORE UPDATE ON accantonamenti
FOR EACH ROW
EXECUTE FUNCTION update_accantonamenti_updated_at();

-- STEP 5: Function e Trigger per ricalcolo saldo
-- ===================================================================
CREATE OR REPLACE FUNCTION update_accantonamento_saldo()
RETURNS TRIGGER AS $$
DECLARE
  nuovo_saldo DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN tipo = 'entrata' THEN importo
      WHEN tipo = 'uscita' THEN -importo
      WHEN tipo = 'trasferimento' THEN importo
      ELSE 0
    END
  ), 0)
  INTO nuovo_saldo
  FROM accantonamento_movements
  WHERE accantonamento_id = COALESCE(NEW.accantonamento_id, OLD.accantonamento_id);

  UPDATE accantonamenti
  SET saldo_attuale = nuovo_saldo
  WHERE id = COALESCE(NEW.accantonamento_id, OLD.accantonamento_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accantonamento_movement_inserted ON accantonamento_movements;
CREATE TRIGGER accantonamento_movement_inserted
AFTER INSERT ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

DROP TRIGGER IF EXISTS accantonamento_movement_deleted ON accantonamento_movements;
CREATE TRIGGER accantonamento_movement_deleted
AFTER DELETE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

DROP TRIGGER IF EXISTS accantonamento_movement_updated ON accantonamento_movements;
CREATE TRIGGER accantonamento_movement_updated
AFTER UPDATE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

-- STEP 6: Crea tabelle daily_revenues
-- ===================================================================
CREATE TABLE IF NOT EXISTS daily_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL,  -- RIMOSSO: REFERENCES beauty_centers(id)
  data DATE NOT NULL,
  importo_totale DECIMAL(10,2) NOT NULL CHECK (importo_totale >= 0),
  numero_clienti INTEGER DEFAULT 0 CHECK (numero_clienti >= 0),
  note TEXT,
  allocations_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, data)
);

CREATE TABLE IF NOT EXISTS daily_revenue_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_revenue_id UUID NOT NULL REFERENCES daily_revenues(id) ON DELETE CASCADE,
  accantonamento_id UUID NOT NULL REFERENCES accantonamenti(id) ON DELETE CASCADE,
  importo_proposto DECIMAL(10,2) NOT NULL CHECK (importo_proposto >= 0),
  importo_finale DECIMAL(10,2) NOT NULL CHECK (importo_finale >= 0),
  modified_by_user BOOLEAN DEFAULT false,
  accantonamento_movement_id UUID REFERENCES accantonamento_movements(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(daily_revenue_id, accantonamento_id)
);

-- STEP 7: Indici daily_revenues
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_daily_revenues_centro ON daily_revenues(centro_id);
CREATE INDEX IF NOT EXISTS idx_daily_revenues_data ON daily_revenues(data);
CREATE INDEX IF NOT EXISTS idx_daily_revenues_centro_data ON daily_revenues(centro_id, data);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_allocations_revenue ON daily_revenue_allocations(daily_revenue_id);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_allocations_acc ON daily_revenue_allocations(accantonamento_id);

-- STEP 8: Trigger daily_revenues
-- ===================================================================
CREATE OR REPLACE FUNCTION update_daily_revenues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_revenues_updated_at ON daily_revenues;
CREATE TRIGGER daily_revenues_updated_at
BEFORE UPDATE ON daily_revenues
FOR EACH ROW
EXECUTE FUNCTION update_daily_revenues_updated_at();

-- STEP 9: Commenti
-- ===================================================================
COMMENT ON TABLE accantonamenti IS 'Portafogli virtuali per gestione riserve (IVA, TFR, progetti, ecc.)';
COMMENT ON TABLE daily_revenues IS 'Traccia incassi giornalieri del centro estetico';
COMMENT ON TABLE daily_revenue_allocations IS 'Collega incassi agli accantonamenti';

-- ===================================================================
-- ✅ COMPLETATO!
-- ===================================================================
-- Tabelle create SENZA foreign key verso beauty_centers
-- Questo permette al sistema di funzionare anche senza quella tabella
-- Se in futuro beauty_centers viene creata, puoi aggiungere la FK con:
-- ALTER TABLE accantonamenti ADD FOREIGN KEY (centro_id) REFERENCES beauty_centers(id);
-- ===================================================================
