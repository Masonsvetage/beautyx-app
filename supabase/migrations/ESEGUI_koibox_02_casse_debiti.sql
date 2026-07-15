-- Aggiunge colonne pagamenti debiti alla tabella koibox_casse
-- Eseguire nel SQL Editor di Supabase

ALTER TABLE koibox_casse
  ADD COLUMN IF NOT EXISTS debiti_contanti  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debiti_carta     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debiti_altri     NUMERIC(10,2) DEFAULT 0;
