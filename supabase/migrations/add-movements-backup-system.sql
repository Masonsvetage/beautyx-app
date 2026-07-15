-- Sistema di backup per movimenti bancari
-- Permette di salvare snapshot prima di cancellazioni e ripristinare se necessario

-- Tabella per i backup dei movimenti
CREATE TABLE IF NOT EXISTS bank_movements_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  backup_type VARCHAR(50) NOT NULL, -- 'pre_cleanup', 'pre_import', 'manual'
  reason TEXT, -- Motivo del backup
  date_from DATE, -- Periodo coperto dal backup
  date_to DATE,
  movements_count INTEGER NOT NULL,
  movements_data JSONB NOT NULL, -- Array di movimenti salvati
  created_at TIMESTAMP DEFAULT now(),
  created_by VARCHAR(100) DEFAULT 'system',
  restored BOOLEAN DEFAULT false,
  restored_at TIMESTAMP,
  metadata JSONB -- Info aggiuntive (chi ha fatto l'operazione, ecc.)
);

-- Indici per performance
CREATE INDEX idx_backups_centro ON bank_movements_backups(centro_id);
CREATE INDEX idx_backups_date_range ON bank_movements_backups(date_from, date_to);
CREATE INDEX idx_backups_created_at ON bank_movements_backups(created_at DESC);
CREATE INDEX idx_backups_restored ON bank_movements_backups(restored);

-- Tabella per log import CSV
CREATE TABLE IF NOT EXISTS csv_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  filename VARCHAR(255),
  date_from DATE, -- Primo movimento nel CSV
  date_to DATE, -- Ultimo movimento nel CSV
  total_movements INTEGER NOT NULL,
  entrate_count INTEGER DEFAULT 0,
  uscite_count INTEGER DEFAULT 0,
  categorized_count INTEGER DEFAULT 0,
  uncategorized_count INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  new_inserted INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  processing_time_ms INTEGER, -- Tempo di elaborazione in millisecondi
  metadata JSONB -- Statistiche aggiuntive
);

-- Indici per log
CREATE INDEX idx_import_logs_centro ON csv_import_logs(centro_id);
CREATE INDEX idx_import_logs_created_at ON csv_import_logs(created_at DESC);

-- Commenti
COMMENT ON TABLE bank_movements_backups IS 'Backup automatici dei movimenti prima di operazioni distruttive';
COMMENT ON COLUMN bank_movements_backups.movements_data IS 'Array JSONB con tutti i movimenti del periodo';
COMMENT ON COLUMN bank_movements_backups.backup_type IS 'Tipo: pre_cleanup (prima cancellazione), pre_import (prima re-import), manual (backup manuale)';

COMMENT ON TABLE csv_import_logs IS 'Log di tutti gli import CSV per tracciabilità e audit';
COMMENT ON COLUMN csv_import_logs.processing_time_ms IS 'Tempo impiegato per processare il CSV in millisecondi';

-- RLS Policies
ALTER TABLE bank_movements_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backups"
  ON bank_movements_backups FOR SELECT
  USING (true);

CREATE POLICY "System can create backups"
  ON bank_movements_backups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own import logs"
  ON csv_import_logs FOR SELECT
  USING (true);

CREATE POLICY "System can create import logs"
  ON csv_import_logs FOR INSERT
  WITH CHECK (true);
