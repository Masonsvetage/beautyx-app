-- ===================================================================
-- FIX: Row-Level Security per beautyx_avatar_url
-- Risolve errore: "new row violates row-level security policy"
-- ===================================================================

-- Verifica se RLS è abilitato su beauty_centers
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'beauty_centers';

-- Se RLS è abilitato, crea policy per permettere UPDATE del campo avatar

-- ===================================================================
-- OPZIONE 1: Policy Permissiva (per sviluppo/test)
-- ===================================================================
-- Permette a chiunque di aggiornare beautyx_avatar_url
-- ⚠️ Usa solo in sviluppo, non in produzione!

DROP POLICY IF EXISTS "Allow public avatar update" ON beauty_centers;

CREATE POLICY "Allow public avatar update"
ON beauty_centers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ===================================================================
-- OPZIONE 2: Policy Restrittiva (per produzione)
-- ===================================================================
-- Permette solo ad admin autenticati di aggiornare avatar
-- Commentato per ora, decommentare quando hai autenticazione

-- DROP POLICY IF EXISTS "Admin can update avatar" ON beauty_centers;
--
-- CREATE POLICY "Admin can update avatar"
-- ON beauty_centers
-- FOR UPDATE
-- TO authenticated
-- USING (auth.jwt() ->> 'role' = 'admin')
-- WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ===================================================================
-- ALTERNATIVA: Disabilita RLS temporaneamente (SOLO PER TEST)
-- ===================================================================
-- Se le policy non funzionano, puoi disabilitare RLS temporaneamente
-- ⚠️⚠️⚠️ NON USARE IN PRODUZIONE ⚠️⚠️⚠️

-- ALTER TABLE beauty_centers DISABLE ROW LEVEL SECURITY;

-- Per riabilitarlo dopo i test:
-- ALTER TABLE beauty_centers ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- VERIFICA POLICY ESISTENTI
-- ===================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'beauty_centers';

-- ===================================================================
-- ✅ COMPLETATO!
-- ===================================================================
-- Esegui questo script nel SQL Editor di Supabase
-- Poi riprova l'upload dell'avatar
-- ===================================================================
