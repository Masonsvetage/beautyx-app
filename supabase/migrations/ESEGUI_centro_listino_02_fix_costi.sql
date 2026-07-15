-- ============================================================
-- centro_listino_02_fix_costi.sql
-- Aggiunge nr_operatrici_operative a costi_esercizio
-- per il corretto calcolo del costo per slot-operatrice.
--
-- Formula costo esercizio corretta:
--   costoMinuto_globale = spese_annuali / (oreAnnuali × 60)
--   costoMinuto_servizio = costoMinuto_globale × nrOp_servizio / (nr_operatrici_operative × 0.5)
--
-- nr_operatrici_operative = estetiste/operatrici attive,
--   ESCLUSE funzioni amministrative, receptionist, direzione.
--   Inserito manualmente dall'utente nella configurazione.
--   Default: conteggio automatico dipendenti attivi dal sistema.
-- ============================================================

ALTER TABLE costi_esercizio
  ADD COLUMN IF NOT EXISTS nr_operatrici_operative INTEGER DEFAULT NULL;

COMMENT ON COLUMN costi_esercizio.nr_operatrici_operative IS
  'Numero operatrici estetiste/operative (escluse admin, reception, direzione). '
  'Usato come denominatore nella formula: costoMin × nrOp_servizio / (nr_op × 0.5). '
  'Se NULL, viene calcolato automaticamente dal conteggio dipendenti attivi.';
