-- ============================================================
-- ESEGUI_listino_ufficiale_03.sql
-- Aggiunge tipo (servizio/prodotto) e codice_barcode a servizi
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

ALTER TABLE servizi
  ADD COLUMN IF NOT EXISTS tipo           VARCHAR(20)  NOT NULL DEFAULT 'servizio'
    CHECK (tipo IN ('servizio', 'prodotto')),
  ADD COLUMN IF NOT EXISTS codice_barcode TEXT         DEFAULT NULL;

COMMENT ON COLUMN servizi.tipo IS
  'Tipo voce listino: servizio (ha tempi operativi) o prodotto (solo costo/prezzo)';
COMMENT ON COLUMN servizi.codice_barcode IS
  'Codice a barre o QR del prodotto (EAN, UPC, codice interno…) per lettura con scanner';
