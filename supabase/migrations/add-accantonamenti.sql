-- Tabelle per Accantonamenti (Portafogli Virtuali)
-- Permette gestione riserve/fondi per tasse, TFR, progetti, ecc.

-- Tabella definizione accantonamenti (portafogli virtuali)
CREATE TABLE IF NOT EXISTS accantonamenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descrizione TEXT,
  importo_obiettivo DECIMAL(10,2) DEFAULT 0,
  saldo_attuale DECIMAL(10,2) DEFAULT 0,
  contributo_mensile DECIMAL(10,2) DEFAULT 0,
  colore VARCHAR(7) DEFAULT '#8b5cf6',
  icona VARCHAR(10) DEFAULT '💰',
  categoria_collegata VARCHAR(100),
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, nome)
);

-- Tabella movimenti accantonamenti
CREATE TABLE IF NOT EXISTS accantonamento_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accantonamento_id UUID NOT NULL REFERENCES accantonamenti(id) ON DELETE CASCADE,
  bank_movement_id UUID REFERENCES bank_movements(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrata', 'uscita', 'trasferimento')),
  importo DECIMAL(10,2) NOT NULL,
  descrizione TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_accantonamenti_centro ON accantonamenti(centro_id);
CREATE INDEX IF NOT EXISTS idx_accantonamenti_attivo ON accantonamenti(attivo);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_acc_id ON accantonamento_movements(accantonamento_id);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_data ON accantonamento_movements(data);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_bank_id ON accantonamento_movements(bank_movement_id);

-- Function per auto-update updated_at
CREATE OR REPLACE FUNCTION update_accantonamenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update
CREATE TRIGGER accantonamenti_updated_at
BEFORE UPDATE ON accantonamenti
FOR EACH ROW
EXECUTE FUNCTION update_accantonamenti_updated_at();

-- Function per ricalcolare saldo accantonamento dopo inserimento/eliminazione movimento
CREATE OR REPLACE FUNCTION update_accantonamento_saldo()
RETURNS TRIGGER AS $$
DECLARE
  nuovo_saldo DECIMAL(10,2);
BEGIN
  -- Calcola il nuovo saldo sommando tutti i movimenti
  SELECT COALESCE(SUM(
    CASE
      WHEN tipo = 'entrata' THEN importo
      WHEN tipo = 'uscita' THEN -importo
      WHEN tipo = 'trasferimento' THEN importo
      ELSE 0
    END
  ), 0)
  INTO nuovo_saldo
  FROM accantonamento_movements
  WHERE accantonamento_id = COALESCE(NEW.accantonamento_id, OLD.accantonamento_id);

  -- Aggiorna il saldo dell'accantonamento
  UPDATE accantonamenti
  SET saldo_attuale = nuovo_saldo
  WHERE id = COALESCE(NEW.accantonamento_id, OLD.accantonamento_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger per ricalcolare saldo dopo insert/update/delete movimento
CREATE TRIGGER accantonamento_movement_inserted
AFTER INSERT ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

CREATE TRIGGER accantonamento_movement_deleted
AFTER DELETE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

CREATE TRIGGER accantonamento_movement_updated
AFTER UPDATE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();
