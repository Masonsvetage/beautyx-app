-- Fix trigger per calcolo giorni rimanenti
-- Separa i trigger per le due tabelle

-- Rimuovi trigger esistente
DROP TRIGGER IF EXISTS trigger_giorni_obiettivi ON obiettivi;
DROP TRIGGER IF EXISTS trigger_giorni_step ON obiettivi_step;
DROP FUNCTION IF EXISTS aggiorna_giorni_rimanenti();

-- Funzione per obiettivi
CREATE OR REPLACE FUNCTION aggiorna_giorni_obiettivi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_target IS NOT NULL THEN
    NEW.giorni_rimanenti := NEW.data_target - CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per step
CREATE OR REPLACE FUNCTION aggiorna_giorni_step()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_scadenza IS NOT NULL THEN
    NEW.giorni_rimanenti := NEW.data_scadenza - CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger separati
CREATE TRIGGER trigger_giorni_obiettivi
  BEFORE INSERT OR UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION aggiorna_giorni_obiettivi();

CREATE TRIGGER trigger_giorni_step
  BEFORE INSERT OR UPDATE ON obiettivi_step
  FOR EACH ROW
  EXECUTE FUNCTION aggiorna_giorni_step();

-- Aggiorna obiettivi esistenti a bozza
UPDATE obiettivi SET stato = 'bozza', attivo = false WHERE stato = 'attivo' OR stato IS NULL;
