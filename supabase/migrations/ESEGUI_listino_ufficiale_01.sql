-- ============================================================
-- ESEGUI_listino_ufficiale_01.sql
-- Aggiunge campi per il congelamento del prezzo ufficiale
-- su ogni servizio del listino.
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

ALTER TABLE servizi
  ADD COLUMN IF NOT EXISTS prezzo_pubblico            DECIMAL(10,2)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prezzo_congelato_at        TIMESTAMPTZ     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS costo_vivo_al_congelamento DECIMAL(10,2)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS margine_min_utile_perc     DECIMAL(5,2)    NOT NULL DEFAULT 40;

COMMENT ON COLUMN servizi.prezzo_pubblico IS
  'Prezzo ufficiale congelato (IVA inclusa) — visibile nel listino stampabile';
COMMENT ON COLUMN servizi.prezzo_congelato_at IS
  'Timestamp di quando il prezzo è stato congelato';
COMMENT ON COLUMN servizi.costo_vivo_al_congelamento IS
  'Snapshot del costo vivo al momento del congelamento, usato per calcolare la deriva dei costi';
COMMENT ON COLUMN servizi.margine_min_utile_perc IS
  'Percentuale minima dell''utile da preservare negli sconti promozionali (default 40%)';
