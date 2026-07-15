-- Aggiunge flag per distinguere movimenti operativi da tecnici

ALTER TABLE bank_movements
ADD COLUMN IF NOT EXISTS movimento_tipo VARCHAR(20) DEFAULT 'operativo'
  CHECK (movimento_tipo IN ('operativo', 'tecnico', 'finanziamento'));

-- Indice per filtrare rapidamente
CREATE INDEX IF NOT EXISTS idx_movements_tipo ON bank_movements(movimento_tipo);

COMMENT ON COLUMN bank_movements.movimento_tipo IS
  'Tipo movimento: operativo (ricavo/costo reale), tecnico (giroconto/anticipo), finanziamento (prestito)';

-- Marca automaticamente i movimenti tecnici esistenti

-- 1. Anticipi POS = finanziamento
UPDATE bank_movements
SET movimento_tipo = 'finanziamento'
WHERE tipo = 'entrata'
  AND categoria = 'POS'
  AND (
    descrizione ILIKE '%ANTICIPO%POS%' OR
    descrizione ILIKE '%APERTURA ANTICIPO%'
  );

-- 2. Giroconti = tecnico (sono ripagamenti anticipi)
UPDATE bank_movements
SET movimento_tipo = 'tecnico'
WHERE categoria = 'Giroconti';

-- Log delle modifiche
DO $$
DECLARE
  finanz_count INTEGER;
  tecnici_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO finanz_count FROM bank_movements WHERE movimento_tipo = 'finanziamento';
  SELECT COUNT(*) INTO tecnici_count FROM bank_movements WHERE movimento_tipo = 'tecnico';

  RAISE NOTICE 'Movimenti marcati come finanziamento: %', finanz_count;
  RAISE NOTICE 'Movimenti marcati come tecnici: %', tecnici_count;
END $$;
