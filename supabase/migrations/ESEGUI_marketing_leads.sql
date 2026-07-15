-- Tabella lead (visitatori che lasciano i contatti prima di registrarsi)
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  centro      TEXT,
  citta       TEXT,
  telefono    TEXT,
  source      TEXT DEFAULT 'landing',
  note        TEXT,
  contattato  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: inserimento pubblico, lettura solo service key
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_insert_public" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "lead_select_admin" ON leads FOR SELECT USING (false); -- solo service key bypassa RLS

-- Tabella eventi di conversione (tracciamento CTA e comportamento)
CREATE TABLE IF NOT EXISTS conversion_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT NOT NULL,
  page        TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_insert_public" ON conversion_events FOR INSERT WITH CHECK (true);
CREATE POLICY "event_select_admin" ON conversion_events FOR SELECT USING (false);
