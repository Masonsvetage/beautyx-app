-- =====================================================
-- Sistema chiamate HPA: minuti mensili + sessioni audio/video
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Minuti mensili per piano
CREATE TABLE IF NOT EXISTS hpa_minute_plans (
  piano TEXT PRIMARY KEY,
  minuti_mensili INTEGER NOT NULL DEFAULT 30,
  descrizione TEXT
);

INSERT INTO hpa_minute_plans (piano, minuti_mensili, descrizione) VALUES
  ('demo',         30,  '30 min/mese — solo chat'),
  ('starter',      60,  '60 min/mese — chat, audio'),
  ('professional', 180, '180 min/mese — chat, audio, video'),
  ('enterprise',   360, '360 min/mese per centro — chat, audio, video HD')
ON CONFLICT (piano) DO NOTHING;

-- 2. Crediti mensili per utente (reset ogni mese)
CREATE TABLE IF NOT EXISTS hpa_minute_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  centro_id UUID REFERENCES beauty_centers(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  minutes_total INTEGER NOT NULL DEFAULT 30,
  minutes_used INTEGER NOT NULL DEFAULT 0,
  minutes_extra INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, centro_id, year_month)
);

ALTER TABLE hpa_minute_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono propri crediti" ON hpa_minute_credits;
CREATE POLICY "Utenti vedono propri crediti" ON hpa_minute_credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin vede tutti i crediti" ON hpa_minute_credits;
CREATE POLICY "Admin vede tutti i crediti" ON hpa_minute_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello IN ('admin', 'hpa')
    )
  );

-- 3. Sessioni di chiamata
CREATE TABLE IF NOT EXISTS hpa_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID REFERENCES beauty_centers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  hpa_id UUID REFERENCES auth.users(id),
  call_type TEXT NOT NULL DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
  room_url TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'active', 'completed', 'cancelled', 'missed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  minutes_deducted INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hpa_call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Client e HPA vedono proprie sessioni" ON hpa_call_sessions;
CREATE POLICY "Client e HPA vedono proprie sessioni" ON hpa_call_sessions
  FOR ALL USING (auth.uid() = client_id OR auth.uid() = hpa_id);

DROP POLICY IF EXISTS "Admin vede tutte le sessioni" ON hpa_call_sessions;
CREATE POLICY "Admin vede tutte le sessioni" ON hpa_call_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );

-- 4. Aggiunge colonna piano a user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS piano TEXT DEFAULT 'demo';

-- Verifica risultato
SELECT 'hpa_minute_plans' AS tabella, COUNT(*) AS righe FROM hpa_minute_plans
UNION ALL
SELECT 'hpa_minute_credits', COUNT(*) FROM hpa_minute_credits
UNION ALL
SELECT 'hpa_call_sessions', COUNT(*) FROM hpa_call_sessions;
