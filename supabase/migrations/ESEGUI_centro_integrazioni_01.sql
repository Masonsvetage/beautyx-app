-- ============================================================
-- centro_integrazioni — chiavi API per gestionali per centro
-- ============================================================
-- Esegui in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS centro_integrazioni (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id   UUID        NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  gestionale  TEXT        NOT NULL,   -- 'koibox', 'mindbody', 'fresha', ecc.
  api_key     TEXT,                   -- chiave API (solo server-side)
  config      JSONB       DEFAULT '{}',
  is_active   BOOLEAN     DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(centro_id, gestionale)
);

-- Solo service key può accedere (dati sensibili)
ALTER TABLE centro_integrazioni ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'centro_integrazioni' AND policyname = 'no_direct_access'
  ) THEN
    EXECUTE 'CREATE POLICY no_direct_access ON centro_integrazioni USING (false)';
  END IF;
END$$;
