-- Migration: Fix Soglie Alert - riferimento corretto a beauty_centers
-- Eseguire in Supabase SQL Editor

-- Prima elimina la tabella se esiste con il riferimento sbagliato
DROP TABLE IF EXISTS soglie_alert CASCADE;

-- Ricrea la tabella con il riferimento corretto
CREATE TABLE soglie_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,

  -- Tipo di soglia: 'costi' (% su costi totali) o 'fatturato' (% su fatturato)
  tipo_soglia VARCHAR(20) NOT NULL CHECK (tipo_soglia IN ('costi', 'fatturato', 'crescita', 'margine')),

  -- Categoria a cui si applica (NULL = default per tutte)
  categoria VARCHAR(100),

  -- Valore soglia in percentuale
  valore DECIMAL(5,2) NOT NULL,

  -- Se true, usa il valore BeautyX di default invece del valore personalizzato
  usa_default BOOLEAN DEFAULT false,

  -- Metadati
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un centro può avere una sola soglia per tipo+categoria
  UNIQUE(centro_id, tipo_soglia, categoria)
);

-- Indice per query veloci
CREATE INDEX idx_soglie_alert_centro ON soglie_alert(centro_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_soglie_alert_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soglie_alert_updated
  BEFORE UPDATE ON soglie_alert
  FOR EACH ROW
  EXECUTE FUNCTION update_soglie_alert_timestamp();

-- RLS Policies
ALTER TABLE soglie_alert ENABLE ROW LEVEL SECURITY;

-- Policy: lettura (tutti gli utenti autenticati)
CREATE POLICY "Lettura soglie" ON soglie_alert
  FOR SELECT TO authenticated USING (true);

-- Policy: inserimento
CREATE POLICY "Inserimento soglie" ON soglie_alert
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: aggiornamento
CREATE POLICY "Aggiornamento soglie" ON soglie_alert
  FOR UPDATE TO authenticated USING (true);

-- Policy: eliminazione
CREATE POLICY "Eliminazione soglie" ON soglie_alert
  FOR DELETE TO authenticated USING (true);

-- Commenti
COMMENT ON TABLE soglie_alert IS 'Soglie personalizzate per alert finanziari per ogni centro';
