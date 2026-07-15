-- ============================================
-- SISTEMA OBIETTIVI - CICLO DI VITA COMPLETO
-- ============================================

-- Aggiunta colonne alla tabella obiettivi (una alla volta)
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS analisi_situazione TEXT;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS esigenze_identificate TEXT;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS motivazione TEXT;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS data_target DATE;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS giorni_rimanenti INTEGER;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS stato VARCHAR(30) DEFAULT 'attivo';
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS prorogato_da UUID;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS numero_proroghe INTEGER DEFAULT 0;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS consulente_beautyx VARCHAR(255);
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS consulente_hpa VARCHAR(255);
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS data_ultima_revisione TIMESTAMPTZ;
ALTER TABLE obiettivi ADD COLUMN IF NOT EXISTS prossima_revisione DATE;

-- Tabella STEP degli obiettivi
CREATE TABLE IF NOT EXISTS obiettivi_step (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obiettivo_id UUID NOT NULL REFERENCES obiettivi(id) ON DELETE CASCADE,
  ordine INTEGER NOT NULL DEFAULT 1,
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  data_inizio DATE,
  data_scadenza DATE NOT NULL,
  giorni_rimanenti INTEGER,
  valore_target DECIMAL(12,2),
  unita_misura VARCHAR(50),
  valore_raggiunto DECIMAL(12,2),
  stato VARCHAR(20) DEFAULT 'pending',
  completato_il TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella VALUTAZIONI degli obiettivi
CREATE TABLE IF NOT EXISTS obiettivi_valutazioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obiettivo_id UUID NOT NULL REFERENCES obiettivi(id) ON DELETE CASCADE,
  data_valutazione DATE NOT NULL DEFAULT CURRENT_DATE,
  risultato_ottenuto TEXT NOT NULL,
  valore_finale DECIMAL(12,2),
  obiettivo_raggiunto BOOLEAN,
  percentuale_raggiungimento DECIMAL(5,2),
  impressioni_utente TEXT,
  difficolta_incontrate TEXT,
  punti_di_forza TEXT,
  suggerimenti_miglioramento TEXT,
  note_consulente TEXT,
  valutazione_consulente INTEGER,
  decisione VARCHAR(20) NOT NULL,
  nuova_data_target DATE,
  nuovo_valore_obiettivo DECIMAL(12,2),
  motivazione_proroga TEXT,
  valutato_da VARCHAR(50) DEFAULT 'centro',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella STORICO per audit trail
CREATE TABLE IF NOT EXISTS obiettivi_storico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obiettivo_id UUID NOT NULL REFERENCES obiettivi(id) ON DELETE CASCADE,
  azione VARCHAR(50) NOT NULL,
  descrizione TEXT,
  dati_precedenti JSONB,
  dati_nuovi JSONB,
  eseguito_da VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_obiettivi_stato ON obiettivi(centro_id, stato);
CREATE INDEX IF NOT EXISTS idx_obiettivi_target ON obiettivi(data_target);
CREATE INDEX IF NOT EXISTS idx_step_obiettivo ON obiettivi_step(obiettivo_id, ordine);
CREATE INDEX IF NOT EXISTS idx_step_scadenza ON obiettivi_step(data_scadenza);
CREATE INDEX IF NOT EXISTS idx_valutazioni_obiettivo ON obiettivi_valutazioni(obiettivo_id);
CREATE INDEX IF NOT EXISTS idx_storico_obiettivo ON obiettivi_storico(obiettivo_id, created_at DESC);

-- Funzione per calcolare giorni rimanenti
CREATE OR REPLACE FUNCTION aggiorna_giorni_rimanenti()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'obiettivi' AND NEW.data_target IS NOT NULL THEN
    NEW.giorni_rimanenti := NEW.data_target - CURRENT_DATE;
  END IF;
  IF TG_TABLE_NAME = 'obiettivi_step' AND NEW.data_scadenza IS NOT NULL THEN
    NEW.giorni_rimanenti := NEW.data_scadenza - CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare giorni rimanenti
DROP TRIGGER IF EXISTS trigger_giorni_obiettivi ON obiettivi;
CREATE TRIGGER trigger_giorni_obiettivi
  BEFORE INSERT OR UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION aggiorna_giorni_rimanenti();

DROP TRIGGER IF EXISTS trigger_giorni_step ON obiettivi_step;
CREATE TRIGGER trigger_giorni_step
  BEFORE INSERT OR UPDATE ON obiettivi_step
  FOR EACH ROW
  EXECUTE FUNCTION aggiorna_giorni_rimanenti();

-- RLS per nuove tabelle
ALTER TABLE obiettivi_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE obiettivi_valutazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE obiettivi_storico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS step_all_policy ON obiettivi_step;
CREATE POLICY step_all_policy ON obiettivi_step FOR ALL USING (true);

DROP POLICY IF EXISTS valutazioni_all_policy ON obiettivi_valutazioni;
CREATE POLICY valutazioni_all_policy ON obiettivi_valutazioni FOR ALL USING (true);

DROP POLICY IF EXISTS storico_all_policy ON obiettivi_storico;
CREATE POLICY storico_all_policy ON obiettivi_storico FOR ALL USING (true);

-- Aggiorna obiettivi esistenti
UPDATE obiettivi SET stato = 'attivo' WHERE stato IS NULL;
