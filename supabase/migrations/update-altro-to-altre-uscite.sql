-- Rinomina "Altro" in "USCITE VARIE" e unisce con "Altre Uscite"

-- Step 1: Rinomina la categoria di default "Altro" → "USCITE VARIE" e cambia tipo
UPDATE custom_categories
SET
  nome = 'USCITE VARIE',
  tipo = 'uscita'
WHERE
  centro_id = '1a72344b-aac1-465b-92d4-7e670f430340'
  AND nome = 'Altro'
  AND is_default = true;

-- Step 2: Aggiorna i movimenti che hanno "Altro" → "USCITE VARIE"
UPDATE bank_movements
SET categoria = 'USCITE VARIE'
WHERE
  centro_id = '1a72344b-aac1-465b-92d4-7e670f430340'
  AND categoria = 'Altro';

-- Step 3: Sposta i movimenti da "Altre Uscite" → "USCITE VARIE"
UPDATE bank_movements
SET categoria = 'USCITE VARIE'
WHERE
  centro_id = '1a72344b-aac1-465b-92d4-7e670f430340'
  AND categoria = 'Altre Uscite';

-- Step 4: Elimina la categoria "Altre Uscite" (ormai inutilizzata)
DELETE FROM custom_categories
WHERE
  centro_id = '1a72344b-aac1-465b-92d4-7e670f430340'
  AND nome = 'Altre Uscite';
