-- ============================================
-- RICOSTRUZIONE FEATURE "OBIETTIVI" — 2026-08-21
-- ============================================
-- Contesto: le tabelle obiettivi/obiettivi_step/progressi_obiettivi/
-- obiettivi_valutazioni/obiettivi_storico esistevano nel vecchio progetto
-- Supabase (creato da add-objectives-tracking.sql +
-- update-objectives-full-lifecycle.sql + 20260117_fix_obiettivi_default_suggeriti.sql)
-- ma non sono mai state ricreate durante la migrazione al nuovo progetto
-- Supabase del 17/07/2026 (vedi memory/davide.md, sezione "Mistero tabella
-- obiettivi/obiettivi_step vs objectives_3s — chiarito"). La tabella
-- objectives_3s comparsa nel nuovo progetto è un dominio diverso
-- (framework SvetAge/4 Elementi) e non sostituisce questo modulo.
--
-- Questa migration ricrea lo schema ORIGINALE verificandolo però contro le
-- query reali del codice attuale (app/api/obiettivi*, app/api/progressi-obiettivi,
-- app/obiettivi/page.js). Differenze rispetto alle vecchie migration, con
-- motivazione:
--
--   1. CHECK su `obiettivi.tipo`: aggiunto il valore 'formazione', presente
--      nella select del wizard frontend (TIPI_OBIETTIVO in app/obiettivi/page.js)
--      ma MAI aggiunto al CHECK originale (bug storico nella vecchia migration,
--      mai emerso perché in produzione la tabella non è mai stata toccata con
--      questo valore prima d'ora).
--   2. Aggiunto un CHECK esplicito su `obiettivi.stato` con i 7 valori
--      effettivamente usati dal codice (suggerito, bozza, attivo,
--      in_valutazione, concluso, prorogato, sospeso — da STATI_LABELS in
--      app/obiettivi/page.js e dai valori scritti da
--      app/api/obiettivi/suggeriti/route.js e dal flusso di valutazione).
--      La vecchia migration non aveva alcun CHECK su questa colonna (VARCHAR(30)
--      libero): qui si aggiunge come garanzia, dato che l'insieme di valori è
--      ormai chiaramente definito dal codice.
--   3. RLS: le vecchie migration usavano policy permissive `USING (true)` su
--      queste 5 tabelle. Il codice attuale, però, esegue le query dati con un
--      client Supabase creato con SERVICE_KEY (bypass RLS) in quasi tutti gli
--      endpoint "per centro" del progetto (accantonamenti, bank_movements,
--      budget, ecc. — verificato su schema prod), NON con l'anon client che
--      userebbe RLS. Policy permissive `USING (true)` con RLS abilitata
--      sarebbero comunque raggiungibili da chiunque abbia la ANON KEY pubblica
--      chiamando direttamente l'endpoint REST di Supabase, bypassando
--      interamente il controllo di ownership applicativo
--      (verifyCentroOwnership) — esattamente ciò che il compito chiede di
--      evitare ("non aperte a lettura pubblica"). Qui si abilita RLS SENZA
--      alcuna policy per i ruoli anon/authenticated, coerente con il pattern
--      già in uso per le altre tabelle "per centro" del progetto
--      (accantonamenti, bank_movements, objectives_3s, svetage_metrics,
--      ai_conversations, proactive_insights, savings_goals): l'unico accesso
--      è tramite il client server-side con SERVICE_KEY, e il confine di
--      sicurezza reale è applicativo (verifyCentroOwnership /
--      verifyRowCentroOwnership, già presenti in questi endpoint). Le route
--      API sono state aggiornate in parallelo per usare il client SERVICE_KEY
--      sulle query dati (erano rimaste sul client anon `lib/supabase.js` per
--      via di un fix precedente che aveva toccato solo il controllo di
--      ownership, non il client dati — vedi memory/davide.md).
--
-- ============================================

-- ============================================
-- TABELLA: obiettivi
-- ============================================
CREATE TABLE IF NOT EXISTS obiettivi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,

  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  icona VARCHAR(10) DEFAULT '🎯',

  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'economico', 'clienti', 'servizi', 'prodotti', 'efficienza',
    'qualita', 'marketing', 'formazione', 'altro'
  )),

  unita_misura VARCHAR(50) DEFAULT 'numero',
  valore_riferimento DECIMAL(12,2) NOT NULL,
  valore_obiettivo DECIMAL(12,2),
  direzione VARCHAR(20) DEFAULT 'maggiore' CHECK (direzione IN ('maggiore', 'minore', 'uguale')),

  frequenza VARCHAR(20) DEFAULT 'giornaliero' CHECK (frequenza IN (
    'giornaliero', 'settimanale', 'mensile', 'trimestrale'
  )),
  data_inizio DATE DEFAULT CURRENT_DATE,
  data_fine DATE,

  creato_da VARCHAR(50) DEFAULT 'beautyx' CHECK (creato_da IN ('beautyx', 'hpa', 'centro')),
  visibile_beautyx BOOLEAN DEFAULT TRUE,
  visibile_hpa BOOLEAN DEFAULT TRUE,
  visibile_centro BOOLEAN DEFAULT TRUE,

  attivo BOOLEAN DEFAULT TRUE,
  priorita INTEGER DEFAULT 1,

  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Colonne ciclo di vita completo (da update-objectives-full-lifecycle.sql)
  analisi_situazione TEXT,
  esigenze_identificate TEXT,
  motivazione TEXT,
  data_target DATE,
  giorni_rimanenti INTEGER,
  stato VARCHAR(30) DEFAULT 'attivo' CHECK (stato IN (
    'suggerito', 'bozza', 'attivo', 'in_valutazione', 'concluso', 'prorogato', 'sospeso'
  )),
  prorogato_da UUID,
  numero_proroghe INTEGER DEFAULT 0,
  consulente_beautyx VARCHAR(255),
  consulente_hpa VARCHAR(255),
  data_ultima_revisione TIMESTAMPTZ,
  prossima_revisione DATE
);

-- ============================================
-- TABELLA: progressi_obiettivi
-- ============================================
CREATE TABLE IF NOT EXISTS progressi_obiettivi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obiettivo_id UUID NOT NULL REFERENCES obiettivi(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,

  data DATE NOT NULL,
  valore_registrato DECIMAL(12,2) NOT NULL,
  percentuale_raggiungimento DECIMAL(5,2),
  obiettivo_raggiunto BOOLEAN DEFAULT FALSE,
  note TEXT,
  registrato_da VARCHAR(50) DEFAULT 'centro',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Richiesto da app/api/progressi-obiettivi/route.js POST (upsert onConflict 'obiettivo_id,data')
  UNIQUE(obiettivo_id, data)
);

-- ============================================
-- TABELLA: obiettivi_step
-- ============================================
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

-- ============================================
-- TABELLA: obiettivi_valutazioni
-- ============================================
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

-- ============================================
-- TABELLA: obiettivi_storico
-- ============================================
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

-- ============================================
-- INDICI
-- ============================================
CREATE INDEX IF NOT EXISTS idx_obiettivi_centro ON obiettivi(centro_id);
CREATE INDEX IF NOT EXISTS idx_obiettivi_attivo ON obiettivi(centro_id, attivo);
CREATE INDEX IF NOT EXISTS idx_obiettivi_tipo ON obiettivi(tipo);
CREATE INDEX IF NOT EXISTS idx_obiettivi_stato ON obiettivi(centro_id, stato);
CREATE INDEX IF NOT EXISTS idx_obiettivi_target ON obiettivi(data_target);

CREATE INDEX IF NOT EXISTS idx_progressi_obiettivo ON progressi_obiettivi(obiettivo_id);
CREATE INDEX IF NOT EXISTS idx_progressi_data ON progressi_obiettivi(centro_id, data);
CREATE INDEX IF NOT EXISTS idx_progressi_periodo ON progressi_obiettivi(centro_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_step_obiettivo ON obiettivi_step(obiettivo_id, ordine);
CREATE INDEX IF NOT EXISTS idx_step_scadenza ON obiettivi_step(data_scadenza);

CREATE INDEX IF NOT EXISTS idx_valutazioni_obiettivo ON obiettivi_valutazioni(obiettivo_id);
CREATE INDEX IF NOT EXISTS idx_storico_obiettivo ON obiettivi_storico(obiettivo_id, created_at DESC);

-- ============================================
-- TRIGGER: calcolo automatico raggiungimento progresso
-- ============================================
CREATE OR REPLACE FUNCTION calcola_raggiungimento_obiettivo()
RETURNS TRIGGER AS $$
DECLARE
  v_obiettivo RECORD;
  v_percentuale DECIMAL(5,2);
  v_raggiunto BOOLEAN;
BEGIN
  SELECT * INTO v_obiettivo FROM obiettivi WHERE id = NEW.obiettivo_id;

  IF v_obiettivo IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_obiettivo.direzione = 'maggiore' THEN
    v_percentuale := (NEW.valore_registrato / NULLIF(v_obiettivo.valore_riferimento, 0)) * 100;
    v_raggiunto := NEW.valore_registrato >= COALESCE(v_obiettivo.valore_obiettivo, v_obiettivo.valore_riferimento);
  ELSIF v_obiettivo.direzione = 'minore' THEN
    v_percentuale := (v_obiettivo.valore_riferimento / NULLIF(NEW.valore_registrato, 0)) * 100;
    v_raggiunto := NEW.valore_registrato <= COALESCE(v_obiettivo.valore_obiettivo, v_obiettivo.valore_riferimento);
  ELSE
    v_percentuale := 100 - ABS((NEW.valore_registrato - v_obiettivo.valore_riferimento) / NULLIF(v_obiettivo.valore_riferimento, 0) * 100);
    v_raggiunto := NEW.valore_registrato = COALESCE(v_obiettivo.valore_obiettivo, v_obiettivo.valore_riferimento);
  END IF;

  v_percentuale := GREATEST(0, LEAST(200, v_percentuale));

  NEW.percentuale_raggiungimento := v_percentuale;
  NEW.obiettivo_raggiunto := v_raggiunto;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calcola_raggiungimento ON progressi_obiettivi;
CREATE TRIGGER trigger_calcola_raggiungimento
  BEFORE INSERT OR UPDATE ON progressi_obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION calcola_raggiungimento_obiettivo();

-- ============================================
-- TRIGGER: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_obiettivi_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_obiettivi_updated ON obiettivi;
CREATE TRIGGER trigger_obiettivi_updated
  BEFORE UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION update_obiettivi_timestamp();

DROP TRIGGER IF EXISTS trigger_progressi_updated ON progressi_obiettivi;
CREATE TRIGGER trigger_progressi_updated
  BEFORE UPDATE ON progressi_obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION update_obiettivi_timestamp();

DROP TRIGGER IF EXISTS trigger_step_updated ON obiettivi_step;
CREATE TRIGGER trigger_step_updated
  BEFORE UPDATE ON obiettivi_step
  FOR EACH ROW
  EXECUTE FUNCTION update_obiettivi_timestamp();

-- ============================================
-- TRIGGER: giorni_rimanenti (obiettivi: da data_target: obiettivi_step: da data_scadenza)
-- ============================================
CREATE OR REPLACE FUNCTION obiettivi_calc_giorni_rimanenti()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_target IS NOT NULL THEN
    NEW.giorni_rimanenti := NEW.data_target - CURRENT_DATE;
  ELSE
    NEW.giorni_rimanenti := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_giorni_obiettivi ON obiettivi;
CREATE TRIGGER trigger_giorni_obiettivi
  BEFORE INSERT OR UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION obiettivi_calc_giorni_rimanenti();

CREATE OR REPLACE FUNCTION obiettivi_step_calc_giorni_rimanenti()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_scadenza IS NOT NULL THEN
    NEW.giorni_rimanenti := NEW.data_scadenza - CURRENT_DATE;
  ELSE
    NEW.giorni_rimanenti := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_giorni_step ON obiettivi_step;
CREATE TRIGGER trigger_giorni_step
  BEFORE INSERT OR UPDATE ON obiettivi_step
  FOR EACH ROW
  EXECUTE FUNCTION obiettivi_step_calc_giorni_rimanenti();

-- ============================================
-- RLS — abilitata su tutte, NESSUNA policy per anon/authenticated
-- ============================================
-- Pattern identico alle altre tabelle "per centro" del progetto
-- (accantonamenti, bank_movements, objectives_3s, svetage_metrics,
-- ai_conversations, proactive_insights, savings_goals): RLS abilitata,
-- zero policy pubbliche. L'unico accesso è tramite il client server-side
-- con SUPABASE_SERVICE_KEY (bypassa RLS), usato dalle route API dopo aver
-- già verificato l'ownership del centro con verifyCentroOwnership /
-- verifyRowCentroOwnership. Non si concede MAI accesso diretto ad anon/authenticated:
-- diversamente dalla vecchia policy USING(true), qui chiunque avesse solo la
-- ANON KEY pubblica non potrebbe leggere/scrivere nulla direttamente via REST.
ALTER TABLE obiettivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressi_obiettivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE obiettivi_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE obiettivi_valutazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE obiettivi_storico ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COMMENTI
-- ============================================
COMMENT ON TABLE obiettivi IS 'Definizione obiettivi concordati con Beautyx/HPA (ricreata 2026-08-21 dopo la migrazione Supabase del 17/07/2026)';
COMMENT ON TABLE progressi_obiettivi IS 'Tracciamento progressi giornalieri degli obiettivi';
COMMENT ON TABLE obiettivi_step IS 'Step/milestone di un obiettivo';
COMMENT ON TABLE obiettivi_valutazioni IS 'Valutazioni periodiche di un obiettivo (concludi/proroga/abbandona)';
COMMENT ON TABLE obiettivi_storico IS 'Audit trail delle modifiche a un obiettivo';
COMMENT ON COLUMN obiettivi.valore_riferimento IS 'Valore di riferimento/benchmark (es. media storica)';
COMMENT ON COLUMN obiettivi.valore_obiettivo IS 'Valore target da raggiungere (se diverso dal riferimento)';
COMMENT ON COLUMN obiettivi.direzione IS 'Direzione del miglioramento: maggiore/minore/uguale';
