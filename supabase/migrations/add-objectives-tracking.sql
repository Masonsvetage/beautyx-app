-- ============================================
-- SISTEMA TRACCIAMENTO OBIETTIVI
-- ============================================
-- Permette di definire obiettivi concordati con Beautyx/HPA
-- e tracciare i progressi giornalieri
-- ============================================

-- Tabella definizione obiettivi
CREATE TABLE IF NOT EXISTS obiettivi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,

  -- Informazioni obiettivo
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  icona VARCHAR(10) DEFAULT '🎯',

  -- Tipo obiettivo
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'economico',      -- Fatturato, incasso, margine
    'clienti',        -- Numero clienti
    'servizi',        -- Numero servizi erogati
    'prodotti',       -- Vendita prodotti
    'efficienza',     -- Tempo medio servizio, tasso occupazione
    'qualita',        -- Recensioni, soddisfazione
    'marketing',      -- Lead, conversioni
    'altro'           -- Obiettivi personalizzati
  )),

  -- Parametri di misura
  unita_misura VARCHAR(50) DEFAULT 'numero', -- numero, euro, percentuale, minuti, etc.
  valore_riferimento DECIMAL(12,2) NOT NULL, -- valore target/benchmark (es. 6 clienti)
  valore_obiettivo DECIMAL(12,2),            -- valore obiettivo se diverso dal riferimento
  direzione VARCHAR(20) DEFAULT 'maggiore' CHECK (direzione IN ('maggiore', 'minore', 'uguale')),

  -- Frequenza e periodo
  frequenza VARCHAR(20) DEFAULT 'giornaliero' CHECK (frequenza IN (
    'giornaliero',
    'settimanale',
    'mensile',
    'trimestrale'
  )),
  data_inizio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine DATE,

  -- Origine e visibilità
  creato_da VARCHAR(50) DEFAULT 'beautyx' CHECK (creato_da IN ('beautyx', 'hpa', 'centro')),
  visibile_beautyx BOOLEAN DEFAULT TRUE,
  visibile_hpa BOOLEAN DEFAULT TRUE,
  visibile_centro BOOLEAN DEFAULT TRUE,

  -- Stato
  attivo BOOLEAN DEFAULT TRUE,
  priorita INTEGER DEFAULT 1, -- 1 = alta, 2 = media, 3 = bassa

  -- Metadata
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella progressi giornalieri obiettivi
CREATE TABLE IF NOT EXISTS progressi_obiettivi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obiettivo_id UUID NOT NULL REFERENCES obiettivi(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,

  -- Data del progresso
  data DATE NOT NULL,

  -- Valore registrato
  valore_registrato DECIMAL(12,2) NOT NULL,

  -- Calcolo automatico raggiungimento
  percentuale_raggiungimento DECIMAL(5,2), -- calcolato automaticamente
  obiettivo_raggiunto BOOLEAN DEFAULT FALSE,

  -- Note giornaliere
  note TEXT,

  -- Chi ha registrato
  registrato_da VARCHAR(50) DEFAULT 'centro',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vincolo unicità: un solo record per obiettivo per giorno
  UNIQUE(obiettivo_id, data)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_obiettivi_centro ON obiettivi(centro_id);
CREATE INDEX IF NOT EXISTS idx_obiettivi_attivo ON obiettivi(centro_id, attivo);
CREATE INDEX IF NOT EXISTS idx_obiettivi_tipo ON obiettivi(tipo);
CREATE INDEX IF NOT EXISTS idx_progressi_obiettivo ON progressi_obiettivi(obiettivo_id);
CREATE INDEX IF NOT EXISTS idx_progressi_data ON progressi_obiettivi(centro_id, data);
CREATE INDEX IF NOT EXISTS idx_progressi_periodo ON progressi_obiettivi(centro_id, data DESC);

-- Trigger per calcolare percentuale raggiungimento
CREATE OR REPLACE FUNCTION calcola_raggiungimento_obiettivo()
RETURNS TRIGGER AS $$
DECLARE
  v_obiettivo RECORD;
  v_percentuale DECIMAL(5,2);
  v_raggiunto BOOLEAN;
BEGIN
  -- Recupera dettagli obiettivo
  SELECT * INTO v_obiettivo FROM obiettivi WHERE id = NEW.obiettivo_id;

  IF v_obiettivo IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcola percentuale in base alla direzione
  IF v_obiettivo.direzione = 'maggiore' THEN
    -- Obiettivo: superare il valore di riferimento
    v_percentuale := (NEW.valore_registrato / NULLIF(v_obiettivo.valore_riferimento, 0)) * 100;
    v_raggiunto := NEW.valore_registrato >= COALESCE(v_obiettivo.valore_obiettivo, v_obiettivo.valore_riferimento);
  ELSIF v_obiettivo.direzione = 'minore' THEN
    -- Obiettivo: stare sotto il valore di riferimento
    v_percentuale := (v_obiettivo.valore_riferimento / NULLIF(NEW.valore_registrato, 0)) * 100;
    v_raggiunto := NEW.valore_registrato <= COALESCE(v_obiettivo.valore_obiettivo, v_obiettivo.valore_riferimento);
  ELSE
    -- Obiettivo: raggiungere esattamente il valore
    v_percentuale := 100 - ABS((NEW.valore_registrato - v_obiettivo.valore_riferimento) / NULLIF(v_obiettivo.valore_riferimento, 0) * 100);
    v_raggiunto := NEW.valore_registrato = COALESCE(v_obiettivo.valore_obiettivo, v_obiettivo.valore_riferimento);
  END IF;

  -- Limita percentuale a 0-200%
  v_percentuale := GREATEST(0, LEAST(200, v_percentuale));

  NEW.percentuale_raggiungimento := v_percentuale;
  NEW.obiettivo_raggiunto := v_raggiunto;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcola_raggiungimento
  BEFORE INSERT OR UPDATE ON progressi_obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION calcola_raggiungimento_obiettivo();

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_obiettivi_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_obiettivi_updated
  BEFORE UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION update_obiettivi_timestamp();

CREATE TRIGGER trigger_progressi_updated
  BEFORE UPDATE ON progressi_obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION update_obiettivi_timestamp();

-- RLS Policies
ALTER TABLE obiettivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressi_obiettivi ENABLE ROW LEVEL SECURITY;

-- Policy per obiettivi (accesso completo per ora, da raffinare con auth)
CREATE POLICY "obiettivi_select_policy" ON obiettivi
  FOR SELECT USING (true);

CREATE POLICY "obiettivi_insert_policy" ON obiettivi
  FOR INSERT WITH CHECK (true);

CREATE POLICY "obiettivi_update_policy" ON obiettivi
  FOR UPDATE USING (true);

CREATE POLICY "obiettivi_delete_policy" ON obiettivi
  FOR DELETE USING (true);

-- Policy per progressi
CREATE POLICY "progressi_select_policy" ON progressi_obiettivi
  FOR SELECT USING (true);

CREATE POLICY "progressi_insert_policy" ON progressi_obiettivi
  FOR INSERT WITH CHECK (true);

CREATE POLICY "progressi_update_policy" ON progressi_obiettivi
  FOR UPDATE USING (true);

CREATE POLICY "progressi_delete_policy" ON progressi_obiettivi
  FOR DELETE USING (true);

-- Commenti tabelle
COMMENT ON TABLE obiettivi IS 'Definizione obiettivi concordati con Beautyx/HPA';
COMMENT ON TABLE progressi_obiettivi IS 'Tracciamento progressi giornalieri degli obiettivi';
COMMENT ON COLUMN obiettivi.valore_riferimento IS 'Valore di riferimento/benchmark (es. media storica)';
COMMENT ON COLUMN obiettivi.valore_obiettivo IS 'Valore target da raggiungere (se diverso dal riferimento)';
COMMENT ON COLUMN obiettivi.direzione IS 'Direzione del miglioramento: maggiore/minore/uguale';
