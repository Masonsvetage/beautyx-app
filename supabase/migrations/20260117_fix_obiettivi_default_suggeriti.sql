-- Migrazione: Obiettivi di default devono essere "suggeriti" (disattivi)
-- Gli obiettivi vengono attivati solo dopo consulenza con Beautyx

-- 1. Rimuovi e ricrea trigger senza riferimento a data_scadenza
DROP TRIGGER IF EXISTS trigger_giorni_obiettivi ON obiettivi;
DROP FUNCTION IF EXISTS aggiorna_giorni_obiettivi() CASCADE;

-- Funzione corretta per obiettivi (usa solo data_target)
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

-- Ricrea trigger
CREATE TRIGGER trigger_giorni_obiettivi
  BEFORE INSERT OR UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION aggiorna_giorni_obiettivi();

-- 2. Aggiorna TUTTI gli obiettivi attivi a "suggerito"
-- Saranno attivati solo dopo consulenza
UPDATE obiettivi
SET stato = 'suggerito',
    attivo = false,
    data_inizio = NULL
WHERE stato = 'attivo'
   OR (stato IS NULL AND attivo = true);

-- 3. Verifica che non ci siano più obiettivi attivi di default
-- (questo commento è solo per documentazione)
