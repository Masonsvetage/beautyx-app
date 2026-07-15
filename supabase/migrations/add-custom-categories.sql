-- Tabella categorie personalizzate
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'entrambi')),
  colore VARCHAR(7) DEFAULT '#10B981',
  ordinamento INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, nome)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_custom_categories_centro_id ON custom_categories(centro_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_tipo ON custom_categories(tipo);

-- Inserisci categorie di default per il centro specifico
-- Sostituisci '1a72344b-aac1-465b-92d4-7e670f430340' con il tuo centro_id se diverso
DO $$
DECLARE
  v_centro_id UUID := '1a72344b-aac1-465b-92d4-7e670f430340';
BEGIN
  INSERT INTO custom_categories (centro_id, nome, tipo, ordinamento, is_default) VALUES
    (v_centro_id, 'Dipendenti', 'uscita', 1, true),
    (v_centro_id, 'Professionisti', 'uscita', 2, true),
    (v_centro_id, 'Fornitori', 'uscita', 3, true),
    (v_centro_id, 'Prodotti/Servizi', 'entrambi', 4, true),
    (v_centro_id, 'Marketing', 'uscita', 5, true),
    (v_centro_id, 'Affitto', 'uscita', 6, true),
    (v_centro_id, 'Utenze', 'uscita', 7, true),
    (v_centro_id, 'Assicurazioni', 'uscita', 8, true),
    (v_centro_id, 'Tasse', 'uscita', 9, true),
    (v_centro_id, 'Manutenzione', 'uscita', 10, true),
    (v_centro_id, 'USCITE VARIE', 'uscita', 99, true)
  ON CONFLICT (centro_id, nome) DO NOTHING;
END $$;
