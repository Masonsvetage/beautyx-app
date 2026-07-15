-- ===================================================================
-- RICREA TABELLA ACCANTONAMENTI CON NUOVA STRUTTURA
-- ⚠️ ATTENZIONE: Questo eliminerà la vecchia tabella accantonamenti
-- ===================================================================

-- BACKUP: Se vuoi salvare i dati esistenti, esegui prima:
-- CREATE TABLE accantonamenti_backup AS SELECT * FROM accantonamenti;

-- ===================================================================
-- STEP 1: Elimina vecchia struttura
-- ===================================================================

-- Drop trigger prima (se esistono)
DROP TRIGGER IF EXISTS accantonamenti_updated_at ON accantonamenti;
DROP TRIGGER IF EXISTS accantonamento_movement_inserted ON accantonamento_movements;
DROP TRIGGER IF EXISTS accantonamento_movement_deleted ON accantonamento_movements;
DROP TRIGGER IF EXISTS accantonamento_movement_updated ON accantonamento_movements;

-- Drop tabelle nell'ordine corretto (prima le dipendenti)
DROP TABLE IF EXISTS daily_revenue_allocations CASCADE;
DROP TABLE IF EXISTS daily_revenues CASCADE;
DROP TABLE IF EXISTS accantonamento_movements CASCADE;
DROP TABLE IF EXISTS accantonamenti CASCADE;

-- ===================================================================
-- STEP 2: Crea NUOVA struttura accantonamenti
-- ===================================================================

CREATE TABLE accantonamenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL,
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

-- ===================================================================
-- STEP 3: Crea tabella movimenti
-- ===================================================================

CREATE TABLE accantonamento_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accantonamento_id UUID NOT NULL REFERENCES accantonamenti(id) ON DELETE CASCADE,
  bank_movement_id UUID,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'trasferimento')),
  importo DECIMAL(10,2) NOT NULL,
  descrizione TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- ===================================================================
-- STEP 4: Crea daily_revenues
-- ===================================================================

CREATE TABLE daily_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL,
  data DATE NOT NULL,
  importo_totale DECIMAL(10,2) NOT NULL CHECK (importo_totale >= 0),
  numero_clienti INTEGER DEFAULT 0 CHECK (numero_clienti >= 0),
  note TEXT,
  allocations_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, data)
);

CREATE TABLE daily_revenue_allocations (
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

-- ===================================================================
-- STEP 5: Indici
-- ===================================================================

CREATE INDEX idx_accantonamenti_centro ON accantonamenti(centro_id);
CREATE INDEX idx_accantonamenti_attivo ON accantonamenti(attivo);
CREATE INDEX idx_accantonamento_movements_acc_id ON accantonamento_movements(accantonamento_id);
CREATE INDEX idx_accantonamento_movements_data ON accantonamento_movements(data);
CREATE INDEX idx_accantonamento_movements_bank_id ON accantonamento_movements(bank_movement_id);
CREATE INDEX idx_daily_revenues_centro ON daily_revenues(centro_id);
CREATE INDEX idx_daily_revenues_data ON daily_revenues(data);
CREATE INDEX idx_daily_revenues_centro_data ON daily_revenues(centro_id, data);
CREATE INDEX idx_daily_revenue_allocations_revenue ON daily_revenue_allocations(daily_revenue_id);
CREATE INDEX idx_daily_revenue_allocations_acc ON daily_revenue_allocations(accantonamento_id);

-- ===================================================================
-- STEP 6: Functions e Triggers
-- ===================================================================

-- Function per auto-update updated_at
CREATE OR REPLACE FUNCTION update_accantonamenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accantonamenti_updated_at
BEFORE UPDATE ON accantonamenti
FOR EACH ROW
EXECUTE FUNCTION update_accantonamenti_updated_at();

-- Function per ricalcolo saldo
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

CREATE TRIGGER accantonamento_movement_inserted
AFTER INSERT ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

CREATE TRIGGER accantonamento_movement_deleted
AFTER DELETE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

CREATE TRIGGER accantonamento_movement_updated
AFTER UPDATE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

-- Function per daily_revenues
CREATE OR REPLACE FUNCTION update_daily_revenues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_revenues_updated_at
BEFORE UPDATE ON daily_revenues
FOR EACH ROW
EXECUTE FUNCTION update_daily_revenues_updated_at();

-- ===================================================================
-- STEP 7: Commenti
-- ===================================================================

COMMENT ON TABLE accantonamenti IS 'Portafogli virtuali per riserve (IVA, TFR, progetti). Nuova struttura 2025-01-07';
COMMENT ON COLUMN accantonamenti.tipo_versamento IS 'fisso_mensile | percentuale_incasso | manuale';
COMMENT ON COLUMN accantonamenti.percentuale_incasso IS 'Percentuale su incassi (es: 22 per IVA 22%)';
COMMENT ON TABLE daily_revenues IS 'Incassi giornalieri per allocazione automatica';
COMMENT ON TABLE daily_revenue_allocations IS 'Link tra incassi e accantonamenti con audit trail';

-- ===================================================================
-- ✅ RICREAZIONE COMPLETATA!
-- ===================================================================
-- Tabelle ricreate con nuova struttura:
-- - accantonamenti (con nome, tipo_versamento, percentuale_incasso)
-- - accantonamento_movements
-- - daily_revenues
-- - daily_revenue_allocations
--
-- ⚠️ NOTA: I dati vecchi sono stati eliminati
-- Se serve recuperarli, ripristina da accantonamenti_backup
-- ===================================================================
