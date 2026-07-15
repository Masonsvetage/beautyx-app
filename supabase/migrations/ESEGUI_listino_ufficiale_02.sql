-- ============================================================
-- ESEGUI_listino_ufficiale_02.sql
-- Aggiunge campo note_interne alla tabella servizi
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

ALTER TABLE servizi
  ADD COLUMN IF NOT EXISTS note_interne TEXT DEFAULT NULL;

COMMENT ON COLUMN servizi.note_interne IS
  'Note operative interne: protocollo del servizio, strategie di miglioramento, suggerimenti HPA/BeautyX';
