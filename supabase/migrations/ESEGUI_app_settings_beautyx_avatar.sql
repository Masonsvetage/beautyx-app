-- =====================================================
-- Crea tabella configurazione globale app
-- Usata per avatar Beautyx AI (globale, uguale per tutti)
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valore iniziale avatar Beautyx
INSERT INTO app_settings (key, value)
VALUES ('beautyx_avatar_url', '/beautyx-avatar.svg')
ON CONFLICT (key) DO NOTHING;

-- RLS: chiunque può leggere, solo admin può scrivere
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono leggere app_settings" ON app_settings;
CREATE POLICY "Tutti possono leggere app_settings" ON app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo admin modifica app_settings" ON app_settings;
CREATE POLICY "Solo admin modifica app_settings" ON app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (ruolo_livello = 'admin' OR ruolo = 'admin'))
  );

SELECT 'Tabella app_settings creata!' AS status;
