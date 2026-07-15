-- Tabella per le categorie predefinite
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'entrambi')),
  icona VARCHAR(50),
  colore VARCHAR(7), -- Hex color code
  descrizione TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per il mapping fornitore -> categoria
CREATE TABLE IF NOT EXISTS vendor_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  vendor_key VARCHAR(255) NOT NULL, -- Chiave normalizzata del fornitore
  vendor_display VARCHAR(255) NOT NULL, -- Nome da visualizzare
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  categoria_custom VARCHAR(100), -- Categoria custom se non usa quelle predefinite
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(centro_id, vendor_key)
);

-- Indici per performance
CREATE INDEX idx_vendor_mappings_centro ON vendor_mappings(centro_id);
CREATE INDEX idx_vendor_mappings_category ON vendor_mappings(category_id);
CREATE INDEX idx_vendor_mappings_vendor_key ON vendor_mappings(vendor_key);

-- Categorie predefinite per centri estetici
INSERT INTO categories (nome, tipo, icona, colore, descrizione) VALUES
  -- ENTRATE
  ('Contanti', 'entrata', '💵', '#10b981', 'Incassi in contanti'),
  ('POS', 'entrata', '💳', '#34d399', 'Pagamenti con carta di credito/bancomat'),
  ('Bonifici', 'entrata', '🏦', '#6ee7b7', 'Bonifici in entrata'),
  ('Rendite Passive', 'entrata', '📈', '#a7f3d0', 'Redditi da investimenti, affitti attivi, etc.'),
  ('Altre Entrate', 'entrata', '💰', '#d1fae5', 'Altre entrate non categorizzate'),

  -- USCITE
  ('Fornitori', 'uscita', '📦', '#ef4444', 'Fornitori di materiali di consumo o beni e servizi che non producono reddito'),
  ('Utenze', 'uscita', '⚡', '#dc2626', 'Luce, gas, energia, acqua, telefono, internet'),
  ('Personale', 'uscita', '👥', '#f87171', 'Stipendi, TFR, premi, contributi dipendenti'),
  ('Investimenti', 'uscita', '💎', '#3b82f6', 'Beni o servizi che possono produrre reddito (attrezzature, formazione, marketing)'),
  ('Affitto', 'uscita', '🏠', '#fca5a5', 'Canone di affitto del locale'),
  ('Tributi Arretrati', 'uscita', '⚠️', '#f59e0b', 'Cartelle esattoriali e sanzioni'),
  ('Tributi Correnti', 'uscita', '📋', '#fbbf24', 'F24, IRPEF, IVA, IMU, INPS, tasse correnti'),
  ('Professionisti', 'uscita', '👔', '#fcd34d', 'Consulente del lavoro, commercialista, avvocato, etc.'),
  ('Finanziamenti', 'uscita', '💳', '#8b5cf6', 'Rate prestiti, mutui, contributi agevolati'),
  ('Altre Uscite', 'uscita', '📤', '#9ca3af', 'Altre uscite non categorizzate')
ON CONFLICT (nome) DO NOTHING;

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_vendor_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_vendor_mappings_updated_at
  BEFORE UPDATE ON vendor_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_mappings_updated_at();

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_mappings ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere le categorie
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Vendor mappings sono visibili solo al centro proprietario
CREATE POLICY "Users can view their own vendor mappings"
  ON vendor_mappings FOR SELECT
  USING (true); -- Per ora tutti possono vedere, poi aggiungeremo auth

CREATE POLICY "Users can insert their own vendor mappings"
  ON vendor_mappings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own vendor mappings"
  ON vendor_mappings FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own vendor mappings"
  ON vendor_mappings FOR DELETE
  USING (true);
