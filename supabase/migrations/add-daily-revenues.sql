-- Migration: Crea tabella per tracciamento incassi giornalieri
-- Data: 2025-01-12
-- Scopo: Persistere incassi giornalieri con suddivisione per metodo di pagamento

-- Drop tabella esistente se presente (versione precedente)
DROP TABLE IF EXISTS daily_revenues CASCADE;

-- Tabella incassi giornalieri
CREATE TABLE daily_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  pos DECIMAL(10,2) DEFAULT 0 CHECK (pos >= 0),
  contanti DECIMAL(10,2) DEFAULT 0 CHECK (contanti >= 0),
  bonifici DECIMAL(10,2) DEFAULT 0 CHECK (bonifici >= 0),
  altro DECIMAL(10,2) DEFAULT 0 CHECK (altro >= 0),
  totale DECIMAL(10,2) NOT NULL CHECK (totale >= 0),
  note TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, data)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_daily_revenues_centro ON daily_revenues(centro_id);
CREATE INDEX IF NOT EXISTS idx_daily_revenues_data ON daily_revenues(data);
CREATE INDEX IF NOT EXISTS idx_daily_revenues_centro_data ON daily_revenues(centro_id, data);

-- Function per auto-update updated_at su daily_revenues
CREATE OR REPLACE FUNCTION update_daily_revenues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update updated_at (drop se esiste già)
DROP TRIGGER IF EXISTS daily_revenues_updated_at ON daily_revenues;

CREATE TRIGGER daily_revenues_updated_at
BEFORE UPDATE ON daily_revenues
FOR EACH ROW
EXECUTE FUNCTION update_daily_revenues_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE daily_revenues IS
  'Traccia incassi giornalieri del centro estetico con suddivisione per metodo di pagamento';

COMMENT ON COLUMN daily_revenues.pos IS
  'Pagamenti ricevuti tramite POS/carte di credito';

COMMENT ON COLUMN daily_revenues.contanti IS
  'Pagamenti ricevuti in contanti';

COMMENT ON COLUMN daily_revenues.bonifici IS
  'Pagamenti ricevuti tramite bonifico bancario';

COMMENT ON COLUMN daily_revenues.altro IS
  'Altri metodi di pagamento (es: assegni, voucher, ecc.)';

COMMENT ON COLUMN daily_revenues.totale IS
  'Totale incasso giornaliero (somma di pos + contanti + bonifici + altro)';
