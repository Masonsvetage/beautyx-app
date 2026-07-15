-- Tabella fornitori
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  pattern_match TEXT NOT NULL, -- Pattern per identificare il fornitore nella descrizione
  categoria VARCHAR(100) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_vendors_centro_id ON vendors(centro_id);

-- Commenti
COMMENT ON TABLE vendors IS 'Elenco fornitori configurati dall utente per migliorare la categorizzazione automatica';
COMMENT ON COLUMN vendors.pattern_match IS 'Pattern di testo (case-insensitive) per identificare il fornitore nella descrizione del movimento. Es: "AMAZON", "GOOGLE ADS"';
COMMENT ON COLUMN vendors.categoria IS 'Categoria da assegnare ai movimenti di questo fornitore. Es: Fornitori, Marketing, Prodotti/Servizi';
