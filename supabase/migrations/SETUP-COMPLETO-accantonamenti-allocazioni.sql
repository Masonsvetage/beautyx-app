-- ===================================================================
-- SETUP COMPLETO: Accantonamenti + Sistema Allocazioni + Daily Revenues
-- Data: 2025-01-07
-- Esegui SOLO questo script - include tutto il necessario
-- ===================================================================

-- ===================================================================
-- PARTE 1: Crea tabelle base accantonamenti (se non esistono)
-- ===================================================================

-- Tabella definizione accantonamenti (portafogli virtuali)
CREATE TABLE IF NOT EXISTS accantonamenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,
  importo_obiettivo DECIMAL(10,2) DEFAULT 0,
  saldo_attuale DECIMAL(10,2) DEFAULT 0,
  contributo_mensile DECIMAL(10,2) DEFAULT 0,
  colore VARCHAR(7) DEFAULT '#8b5cf6',
  icona VARCHAR(10) DEFAULT '💰',
  categoria_collegata VARCHAR(100),
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, nome)
);

-- Tabella movimenti accantonamenti
CREATE TABLE IF NOT EXISTS accantonamento_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accantonamento_id UUID NOT NULL REFERENCES accantonamenti(id) ON DELETE CASCADE,
  bank_movement_id UUID REFERENCES bank_movements(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'trasferimento')),
  importo DECIMAL(10,2) NOT NULL,
  descrizione TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_accantonamenti_centro ON accantonamenti(centro_id);
CREATE INDEX IF NOT EXISTS idx_accantonamenti_attivo ON accantonamenti(attivo);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_acc_id ON accantonamento_movements(accantonamento_id);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_data ON accantonamento_movements(data);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_bank_id ON accantonamento_movements(bank_movement_id);

-- Function per auto-update updated_at
CREATE OR REPLACE FUNCTION update_accantonamenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update
DROP TRIGGER IF EXISTS accantonamenti_updated_at ON accantonamenti;
CREATE TRIGGER accantonamenti_updated_at
BEFORE UPDATE ON accantonamenti
FOR EACH ROW
EXECUTE FUNCTION update_accantonamenti_updated_at();

-- Function per ricalcolare saldo accantonamento dopo inserimento/eliminazione movimento
CREATE OR REPLACE FUNCTION update_accantonamento_saldo()
RETURNS TRIGGER AS $$
DECLARE
  nuovo_saldo DECIMAL(10,2);
BEGIN
  -- Calcola il nuovo saldo sommando tutti i movimenti
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

  -- Aggiorna il saldo dell'accantonamento
  UPDATE accantonamenti
  SET saldo_attuale = nuovo_saldo
  WHERE id = COALESCE(NEW.accantonamento_id, OLD.accantonamento_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger per ricalcolare saldo dopo insert/update/delete movimento
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

-- ===================================================================
-- PARTE 2: Aggiungi tipo_versamento e percentuale_incasso
-- ===================================================================

-- Aggiungi colonne se non esistono
DO $$
BEGIN
  -- Aggiungi tipo_versamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'tipo_versamento'
  ) THEN
    ALTER TABLE accantonamenti
    ADD COLUMN tipo_versamento VARCHAR(30) DEFAULT 'manuale'
      CHECK (tipo_versamento IN ('fisso_mensile', 'percentuale_incasso', 'manuale'));
  END IF;

  -- Aggiungi percentuale_incasso
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'percentuale_incasso'
  ) THEN
    ALTER TABLE accantonamenti
    ADD COLUMN percentuale_incasso DECIMAL(5,2) DEFAULT 0
      CHECK (percentuale_incasso >= 0 AND percentuale_incasso <= 100);
  END IF;
END $$;

-- Commenti per documentazione
COMMENT ON COLUMN accantonamenti.tipo_versamento IS
  'Tipo di versamento: fisso_mensile (contributo mensile fisso), percentuale_incasso (% sugli incassi), manuale (solo contributi manuali)';

COMMENT ON COLUMN accantonamenti.percentuale_incasso IS
  'Percentuale da accantonare sugli incassi (es: 22 per IVA 22%). Usato solo se tipo_versamento = percentuale_incasso';

-- Aggiorna IVA esistente per usare percentuale_incasso (solo se esistono record)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accantonamenti WHERE nome ILIKE '%iva%' OR nome ILIKE '%imposta%') THEN
    UPDATE accantonamenti
    SET tipo_versamento = 'percentuale_incasso', percentuale_incasso = 22
    WHERE nome ILIKE '%iva%' OR nome ILIKE '%imposta%';
  END IF;
END $$;

-- Aggiorna TFR esistente se presente (7.41% tipico)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accantonamenti WHERE nome ILIKE '%tfr%' OR nome ILIKE '%trattamento fine rapporto%') THEN
    UPDATE accantonamenti
    SET tipo_versamento = 'percentuale_incasso', percentuale_incasso = 7.41
    WHERE nome ILIKE '%tfr%' OR nome ILIKE '%trattamento fine rapporto%';
  END IF;
END $$;

-- ===================================================================
-- PARTE 3: Crea tabelle per Daily Revenues
-- ===================================================================

-- Tabella incassi giornalieri
CREATE TABLE IF NOT EXISTS daily_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  importo_totale DECIMAL(10,2) NOT NULL CHECK (importo_totale >= 0),
  numero_clienti INTEGER DEFAULT 0 CHECK (numero_clienti >= 0),
  note TEXT,
  allocations_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, data)
);

-- Tabella allocazioni proposte/confermate
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

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_daily_revenues_centro ON daily_revenues(centro_id);
CREATE INDEX IF NOT EXISTS idx_daily_revenues_data ON daily_revenues(data);
CREATE INDEX IF NOT EXISTS idx_daily_revenues_centro_data ON daily_revenues(centro_id, data);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_allocations_revenue ON daily_revenue_allocations(daily_revenue_id);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_allocations_acc ON daily_revenue_allocations(accantonamento_id);

-- Function per auto-update updated_at su daily_revenues
CREATE OR REPLACE FUNCTION update_daily_revenues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update updated_at
DROP TRIGGER IF EXISTS daily_revenues_updated_at ON daily_revenues;
CREATE TRIGGER daily_revenues_updated_at
BEFORE UPDATE ON daily_revenues
FOR EACH ROW
EXECUTE FUNCTION update_daily_revenues_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE daily_revenues IS
  'Traccia incassi giornalieri del centro estetico per allocazione agli accantonamenti';

COMMENT ON COLUMN daily_revenues.allocations_confirmed IS
  'TRUE se le allocazioni sono state confermate e i movimenti creati';

COMMENT ON TABLE daily_revenue_allocations IS
  'Collega incassi giornalieri agli accantonamenti, tracciando importi proposti vs finali';

COMMENT ON COLUMN daily_revenue_allocations.modified_by_user IS
  'TRUE se utente ha modificato manualmente l''importo suggerito dal sistema';

COMMENT ON COLUMN daily_revenue_allocations.accantonamento_movement_id IS
  'Riferimento al movimento creato quando l''allocazione è confermata';

-- ===================================================================
-- SETUP COMPLETATO CON SUCCESSO! ✅
-- ===================================================================
-- Tabelle create:
-- - accantonamenti (con tipo_versamento e percentuale_incasso)
-- - accantonamento_movements
-- - daily_revenues
-- - daily_revenue_allocations
--
-- Trigger configurati:
-- - Auto-update saldo accantonamenti
-- - Auto-update timestamp
--
-- Sistema pronto per l'uso!
-- ===================================================================
