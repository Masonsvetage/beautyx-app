-- ============================================================
-- ESEGUI_listino_ufficiale_04.sql
-- Backfill codice_barcode per servizi/prodotti già esistenti
-- che non ce l'hanno (creati prima della migrazione 03)
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

-- Prima assicurati che la migrazione 03 sia già stata eseguita
-- (colonne tipo e codice_barcode devono esistere)

WITH ranked AS (
  SELECT
    s.id,
    s.tipo,
    s.centro_id,
    -- Numero categoria: rank alfabetico della categoria nel centro (1-based)
    LPAD(
      RANK() OVER (
        PARTITION BY s.centro_id
        ORDER BY LOWER(COALESCE(TRIM(s.categoria), ''))
      )::text,
      3, '0'
    ) AS cat_num,
    -- Progressivo globale per centro
    LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY s.centro_id
        ORDER BY s.created_at, s.id
      )::text,
      6, '0'
    ) AS prog
  FROM servizi s
  WHERE s.codice_barcode IS NULL
)
UPDATE servizi sv
SET codice_barcode =
  CASE
    WHEN r.tipo = 'prodotto' THEN 'P'
    WHEN r.tipo = 'servizio' THEN 'S'
    ELSE 'A'
  END
  || '-' || r.cat_num
  || '-' || r.prog
FROM ranked r
WHERE sv.id = r.id;

-- Verifica risultato
SELECT id, nome, tipo, categoria, codice_barcode
FROM servizi
ORDER BY centro_id, codice_barcode;
