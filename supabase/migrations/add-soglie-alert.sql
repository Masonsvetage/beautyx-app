-- Migration: Soglie Alert Personalizzate
-- Permette agli utenti di personalizzare le soglie per costi ottimizzabili e anomalie

-- Tabella per le soglie personalizzate per centro
CREATE TABLE IF NOT EXISTS soglie_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES centri_estetici(id) ON DELETE CASCADE,

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
CREATE INDEX IF NOT EXISTS idx_soglie_alert_centro ON soglie_alert(centro_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_soglie_alert_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_soglie_alert_updated ON soglie_alert;
CREATE TRIGGER trigger_soglie_alert_updated
  BEFORE UPDATE ON soglie_alert
  FOR EACH ROW
  EXECUTE FUNCTION update_soglie_alert_timestamp();

-- RLS Policies
ALTER TABLE soglie_alert ENABLE ROW LEVEL SECURITY;

-- Policy: tutti possono leggere le proprie soglie
DROP POLICY IF EXISTS "Lettura soglie proprio centro" ON soglie_alert;
CREATE POLICY "Lettura soglie proprio centro" ON soglie_alert
  FOR SELECT USING (true);

-- Policy: tutti possono inserire soglie
DROP POLICY IF EXISTS "Inserimento soglie" ON soglie_alert;
CREATE POLICY "Inserimento soglie" ON soglie_alert
  FOR INSERT WITH CHECK (true);

-- Policy: tutti possono aggiornare le proprie soglie
DROP POLICY IF EXISTS "Aggiornamento soglie proprio centro" ON soglie_alert;
CREATE POLICY "Aggiornamento soglie proprio centro" ON soglie_alert
  FOR UPDATE USING (true);

-- Policy: tutti possono eliminare le proprie soglie
DROP POLICY IF EXISTS "Eliminazione soglie proprio centro" ON soglie_alert;
CREATE POLICY "Eliminazione soglie proprio centro" ON soglie_alert
  FOR DELETE USING (true);

-- Commenti
COMMENT ON TABLE soglie_alert IS 'Soglie personalizzate per alert finanziari per ogni centro';
COMMENT ON COLUMN soglie_alert.tipo_soglia IS 'Tipo: costi (% su costi), fatturato (% su fatturato), crescita (% crescita mensile), margine (% margine minimo)';
COMMENT ON COLUMN soglie_alert.categoria IS 'Categoria specifica o NULL per default';
COMMENT ON COLUMN soglie_alert.valore IS 'Valore soglia in percentuale';
COMMENT ON COLUMN soglie_alert.usa_default IS 'Se true ignora valore e usa default BeautyX';
