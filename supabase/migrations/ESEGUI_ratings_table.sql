-- =====================================================
-- Tabella valutazioni utenti (HPA + Beautyx AI)
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  centro_id UUID REFERENCES beauty_centers(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('beautyx', 'hpa')),
  target_id UUID NULL,        -- UUID dell'HPA (null per beautyx)
  target_name TEXT NULL,      -- nome snapshot al momento della valutazione
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un solo voto per utente per tipo target
  CONSTRAINT unique_user_target UNIQUE (user_id, target_type)
);

-- Aggiorna updated_at automaticamente
CREATE OR REPLACE FUNCTION update_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_ratings_updated_at();

-- RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti gestiscono proprie valutazioni" ON ratings;
CREATE POLICY "Utenti gestiscono proprie valutazioni" ON ratings
  FOR ALL USING (auth.uid() = user_id);

-- Gli admin leggono tutto tramite service key (RLS bypass)

SELECT 'Tabella ratings creata!' AS status;
