-- ============================================
-- SISTEMA LOG ATTIVITA' PER PIANI DI OTTIMIZZAZIONE
-- ============================================
-- Permette di tracciare le attività svolte nel tempo
-- per ogni piano di ottimizzazione (diario)

-- Tabella per i log/note datate
CREATE TABLE IF NOT EXISTS optimization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES optimization_plans(id) ON DELETE CASCADE,

  -- Dettagli attività
  data_attivita DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT NOT NULL,
  esito TEXT, -- Risultato/esito dell'attività (opzionale)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_optimization_logs_plan ON optimization_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_data ON optimization_logs(data_attivita DESC);

-- Trigger per updated_at
DROP TRIGGER IF EXISTS update_optimization_logs_timestamp ON optimization_logs;
CREATE TRIGGER update_optimization_logs_timestamp
  BEFORE UPDATE ON optimization_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_timestamp();

-- RLS policies
ALTER TABLE optimization_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage optimization logs" ON optimization_logs;
CREATE POLICY "Users can manage optimization logs"
  ON optimization_logs FOR ALL
  USING (true);
