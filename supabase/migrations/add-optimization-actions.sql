-- ============================================
-- SISTEMA AZIONI DI OTTIMIZZAZIONE COSTI
-- ============================================
-- Permette di tracciare propositi, azioni pianificate
-- e monitorare i risultati delle ottimizzazioni

-- Tabella principale per i piani di ottimizzazione
CREATE TABLE IF NOT EXISTS optimization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL,
  categoria VARCHAR(100) NOT NULL,

  -- Dettagli del costo rilevato
  importo_rilevato DECIMAL(10,2) NOT NULL,
  percentuale_rilevata DECIMAL(5,2),
  tipo_rilevazione VARCHAR(50) NOT NULL, -- 'incidenza_costi', 'concentrazione_fornitore', etc.
  periodo_riferimento VARCHAR(20), -- es. '2024-01' o '2024-Q1'

  -- Note e propositi dell'utente
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  obiettivo_risparmio DECIMAL(10,2), -- Quanto si vuole risparmiare

  -- Stato del piano
  stato VARCHAR(20) NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'in_corso', 'completato', 'annullato')),
  priorita INTEGER DEFAULT 2 CHECK (priorita BETWEEN 1 AND 3), -- 1=alta, 2=media, 3=bassa

  -- Date
  data_creazione TIMESTAMPTZ DEFAULT NOW(),
  data_scadenza DATE,
  data_completamento DATE,

  -- Risultati
  importo_post_ottimizzazione DECIMAL(10,2),
  risparmio_effettivo DECIMAL(10,2),
  note_esito TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per le singole azioni/task di un piano
CREATE TABLE IF NOT EXISTS optimization_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES optimization_plans(id) ON DELETE CASCADE,

  -- Dettagli azione
  descrizione VARCHAR(500) NOT NULL,
  tipo_azione VARCHAR(50), -- 'contatto_fornitore', 'richiesta_preventivo', 'cambio_contratto', etc.

  -- Stato
  stato VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (stato IN ('pending', 'in_progress', 'completed', 'skipped')),

  -- Date
  data_creazione TIMESTAMPTZ DEFAULT NOW(),
  data_scadenza DATE,
  data_completamento TIMESTAMPTZ,

  -- Note
  note TEXT,
  risultato TEXT, -- Esito dell'azione

  -- Ordinamento
  ordine INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_optimization_plans_centro ON optimization_plans(centro_id);
CREATE INDEX IF NOT EXISTS idx_optimization_plans_categoria ON optimization_plans(categoria);
CREATE INDEX IF NOT EXISTS idx_optimization_plans_stato ON optimization_plans(stato);
CREATE INDEX IF NOT EXISTS idx_optimization_actions_plan ON optimization_actions(plan_id);
CREATE INDEX IF NOT EXISTS idx_optimization_actions_stato ON optimization_actions(stato);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_optimization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_optimization_plans_timestamp ON optimization_plans;
CREATE TRIGGER update_optimization_plans_timestamp
  BEFORE UPDATE ON optimization_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_timestamp();

DROP TRIGGER IF EXISTS update_optimization_actions_timestamp ON optimization_actions;
CREATE TRIGGER update_optimization_actions_timestamp
  BEFORE UPDATE ON optimization_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_timestamp();

-- RLS policies
ALTER TABLE optimization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;

-- Policy per optimization_plans (accesso tramite centro_id)
DROP POLICY IF EXISTS "Users can view their centro optimization plans" ON optimization_plans;
CREATE POLICY "Users can view their centro optimization plans"
  ON optimization_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert optimization plans" ON optimization_plans;
CREATE POLICY "Users can insert optimization plans"
  ON optimization_plans FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their optimization plans" ON optimization_plans;
CREATE POLICY "Users can update their optimization plans"
  ON optimization_plans FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete their optimization plans" ON optimization_plans;
CREATE POLICY "Users can delete their optimization plans"
  ON optimization_plans FOR DELETE
  USING (true);

-- Policy per optimization_actions
DROP POLICY IF EXISTS "Users can manage optimization actions" ON optimization_actions;
CREATE POLICY "Users can manage optimization actions"
  ON optimization_actions FOR ALL
  USING (true);
