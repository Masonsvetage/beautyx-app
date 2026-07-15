-- ===================================================================
-- FIX: Storage Policies per Bucket Avatars
-- Permette upload e lettura immagini avatar
-- ===================================================================

-- ===================================================================
-- POLICY 1: Permetti upload a tutti (per sviluppo)
-- ===================================================================
-- ⚠️ In produzione, limitare solo ad admin

DROP POLICY IF EXISTS "Allow public upload avatars" ON storage.objects;

CREATE POLICY "Allow public upload avatars"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

-- ===================================================================
-- POLICY 2: Permetti lettura pubblica degli avatar
-- ===================================================================

DROP POLICY IF EXISTS "Allow public read avatars" ON storage.objects;

CREATE POLICY "Allow public read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ===================================================================
-- POLICY 3: Permetti aggiornamento/eliminazione (opzionale)
-- ===================================================================

DROP POLICY IF EXISTS "Allow public update avatars" ON storage.objects;

CREATE POLICY "Allow public update avatars"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow public delete avatars" ON storage.objects;

CREATE POLICY "Allow public delete avatars"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'avatars');

-- ===================================================================
-- VERIFICA POLICY CREATE
-- ===================================================================
SELECT
  policyname,
  cmd,
  tablename
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%';

-- ===================================================================
-- ✅ COMPLETATO!
-- ===================================================================
-- Ora puoi caricare immagini nel bucket avatars
-- ===================================================================
