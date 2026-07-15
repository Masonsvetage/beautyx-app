-- ===================================================================
-- VERIFICA STRUTTURA E RICARICA SCHEMA
-- Esegui questo script per verificare se le colonne esistono
-- e forzare Supabase a ricaricare lo schema
-- ===================================================================

-- STEP 1: Verifica colonne esistenti in accantonamenti
SELECT
  'accantonamenti' as tabella,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'accantonamenti'
ORDER BY ordinal_position;

-- STEP 2: Conta righe nella tabella
SELECT
  'Righe in accantonamenti:' as info,
  COUNT(*) as count
FROM accantonamenti;

-- STEP 3: Forza PostgREST (l'API layer di Supabase) a ricaricare lo schema
-- Questo è CRITICO se le colonne esistono ma l'API non le vede
NOTIFY pgrst, 'reload schema';

-- ===================================================================
-- ✅ FATTO!
-- ===================================================================
-- Se le colonne esistono nella STEP 1 ma l'API continua a fallire,
-- la STEP 3 dovrebbe risolvere forzando il reload dello schema cache.
--
-- Se le colonne NON esistono, devi rieseguire RICREA-accantonamenti-nuova-struttura.sql
-- ===================================================================
