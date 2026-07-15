-- ⚠️ ESEGUIRE QUESTO SQL DIRETTAMENTE NELLA CONSOLE SUPABASE
-- Dashboard Supabase > SQL Editor > New Query > Incolla e Run

-- STEP 1: Elimina il trigger rotto
DROP TRIGGER IF EXISTS trigger_giorni_obiettivi ON obiettivi;
DROP TRIGGER IF EXISTS update_obiettivi_giorni ON obiettivi;
DROP FUNCTION IF EXISTS aggiorna_giorni_obiettivi() CASCADE;
DROP FUNCTION IF EXISTS update_giorni_rimanenti() CASCADE;

-- STEP 2: Ricrea la funzione corretta (usa data_target, non data_scadenza)
CREATE OR REPLACE FUNCTION aggiorna_giorni_obiettivi()
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

-- STEP 3: Ricrea il trigger
CREATE TRIGGER trigger_giorni_obiettivi
  BEFORE INSERT OR UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION aggiorna_giorni_obiettivi();

-- STEP 4: Aggiorna TUTTI gli obiettivi attivi a "suggerito"
-- Saranno attivati SOLO dopo consulenza con Beautyx
UPDATE obiettivi
SET stato = 'suggerito',
    attivo = false,
    data_inizio = NULL
WHERE stato = 'attivo';

-- STEP 5: Verifica (deve mostrare 0 attivi)
SELECT stato, COUNT(*) as totale FROM obiettivi GROUP BY stato;
