-- =====================================================
-- Landing page pubblica: news, reviews pubbliche, config marketing
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. News / Annunci
CREATE TABLE IF NOT EXISTS news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  excerpt TEXT,                         -- breve anteprima (~150 char)
  immagine_url TEXT,
  categoria TEXT DEFAULT 'novita' CHECK (categoria IN ('novita','aggiornamento','evento','offerta')),
  pubblicato BOOLEAN DEFAULT false,
  in_evidenza BOOLEAN DEFAULT false,    -- appare nella hero o in primo piano
  ordine INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_updated_at
  BEFORE UPDATE ON news_posts
  FOR EACH ROW EXECUTE FUNCTION update_news_updated_at();

-- RLS: lettura pubblica solo se pubblicato, scrittura solo admin via service key
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "News pubbliche leggibili da tutti" ON news_posts;
CREATE POLICY "News pubbliche leggibili da tutti" ON news_posts
  FOR SELECT USING (pubblicato = true);

-- 2. Flag approvazione pubblica su ratings
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- 3. Config marketing (benchmark e statistiche personalizzabili)
CREATE TABLE IF NOT EXISTS marketing_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,                          -- etichetta da mostrare in landing
  icona TEXT,                          -- emoji o nome icona
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valori di default
INSERT INTO marketing_config (key, value, label, icona) VALUES
  ('centri_attivi', '0', 'Centri attivi', '🏪'),
  ('incremento_medio_pct', '34', 'Incremento medio ricavi', '📈'),
  ('obiettivi_raggiunti_pct', '89', 'Obiettivi raggiunti', '🎯'),
  ('soddisfazione_media', '4.8', 'Soddisfazione clienti', '⭐'),
  ('risparmio_medio_pct', '22', 'Risparmio medio costi', '💰'),
  ('hero_headline', 'Gestisci il tuo centro estetico con la potenza dell''AI', null, null),
  ('hero_subline', 'Beautyx analizza i tuoi dati, ottimizza i tuoi ricavi e ti affianca con un consulente HPA dedicato.', null, null)
ON CONFLICT (key) DO NOTHING;

-- RLS: leggibile da tutti, modificabile solo tramite service key
ALTER TABLE marketing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Config leggibile da tutti" ON marketing_config;
CREATE POLICY "Config leggibile da tutti" ON marketing_config
  FOR SELECT USING (true);

SELECT 'Landing tables create!' AS status;
