-- Script di debug per verificare lo stato delle tabelle
-- Copia il risultato e mandamelo

-- 1. Verifica se beauty_centers esiste
SELECT 'beauty_centers' as table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_name = 'beauty_centers'
       ) THEN 'ESISTE ✓' ELSE 'NON ESISTE ✗' END as status;

-- 2. Verifica se accantonamenti esiste
SELECT 'accantonamenti' as table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_name = 'accantonamenti'
       ) THEN 'ESISTE ✓' ELSE 'NON ESISTE ✗' END as status;

-- 3. Se accantonamenti esiste, mostra le colonne
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accantonamenti'
ORDER BY ordinal_position;
