-- ===================================================================
-- MIGRATION COMPLETA: Sistema Allocazioni e Daily Revenues
-- Data: 2025-01-07
-- Esegui questo script SOLO SE hai già eseguito add-accantonamenti.sql
-- ===================================================================

-- PARTE 1: Aggiungi tipo_versamento e percentuale_incasso
-- -------------------------------------------------------------------

ALTER TABLE accantonamenti
ADD COLUMN IF NOT EXISTS tipo_versamento VARCHAR(30) DEFAULT 'manuale'
  CHECK (tipo_versamento IN ('fisso_mensile', 'percentuale_incasso', 'manuale')),
ADD COLUMN IF NOT EXISTS percentuale_incasso DECIMAL(5,2) DEFAULT 0
  CHECK (percentuale_incasso >= 0 AND percentuale_incasso <= 100);

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

-- PARTE 2: Crea tabelle per Daily Revenues
-- -------------------------------------------------------------------

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
-- MIGRATION COMPLETATA
-- ===================================================================
