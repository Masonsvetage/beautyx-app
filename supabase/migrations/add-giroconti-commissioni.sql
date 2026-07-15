-- Aggiungi le nuove categorie: Giroconti e Commissioni Bancarie

INSERT INTO categories (nome, tipo, icona, colore, descrizione) VALUES
  ('Giroconti', 'entrambi', '🔄', '#6b7280', 'Movimenti tra conti correnti (non sono entrate o uscite reali)'),
  ('Commissioni Bancarie', 'uscita', '🏦', '#8b5cf6', 'Commissioni, canoni e spese bancarie')
ON CONFLICT (nome) DO NOTHING;
