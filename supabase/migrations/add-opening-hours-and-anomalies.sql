-- Tabella per configurazione orari di apertura settimanali
CREATE TABLE IF NOT EXISTS opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  giorno_settimana INTEGER NOT NULL CHECK (giorno_settimana >= 0 AND giorno_settimana <= 6), -- 0=Lun, 6=Dom
  aperto BOOLEAN DEFAULT true,
  orario_apertura TIME,
  orario_chiusura TIME,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(centro_id, giorno_settimana)
);

-- Tabella per chiusure eccezionali (festività, ferie)
CREATE TABLE IF NOT EXISTS exceptional_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabella per anomalie validate/monitorate
CREATE TABLE IF NOT EXISTS validated_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  movimento_id UUID REFERENCES bank_movements(id) ON DELETE CASCADE,
  tipo_anomalia VARCHAR(50) NOT NULL, -- 'outlier', 'crescita_anomala'
  categoria VARCHAR(100),
  importo DECIMAL(10,2),
  data_rilevamento DATE NOT NULL,
  stato VARCHAR(20) NOT NULL DEFAULT 'confermato', -- 'confermato', 'validato_legittimo', 'risolto'
  note_utente TEXT,
  risolto_in_data DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_opening_hours_centro ON opening_hours(centro_id);
CREATE INDEX IF NOT EXISTS idx_exceptional_closures_centro_date ON exceptional_closures(centro_id, data_inizio, data_fine);
CREATE INDEX IF NOT EXISTS idx_validated_anomalies_centro ON validated_anomalies(centro_id);
CREATE INDEX IF NOT EXISTS idx_validated_anomalies_stato ON validated_anomalies(stato);

-- RLS policies
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptional_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE validated_anomalies ENABLE ROW LEVEL SECURITY;

-- Policy per opening_hours
CREATE POLICY "Allow all operations on opening_hours for authenticated users"
  ON opening_hours FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy per exceptional_closures
CREATE POLICY "Allow all operations on exceptional_closures for authenticated users"
  ON exceptional_closures FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy per validated_anomalies
CREATE POLICY "Allow all operations on validated_anomalies for authenticated users"
  ON validated_anomalies FOR ALL
  USING (true)
  WITH CHECK (true);

-- Funzione per calcolare ore lavorative settimanali
CREATE OR REPLACE FUNCTION calculate_weekly_hours(p_centro_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_hours DECIMAL := 0;
  day_record RECORD;
BEGIN
  FOR day_record IN
    SELECT
      giorno_settimana,
      aperto,
      orario_apertura,
      orario_chiusura
    FROM opening_hours
    WHERE centro_id = p_centro_id
    ORDER BY giorno_settimana
  LOOP
    IF day_record.aperto AND day_record.orario_apertura IS NOT NULL AND day_record.orario_chiusura IS NOT NULL THEN
      total_hours := total_hours + EXTRACT(EPOCH FROM (day_record.orario_chiusura - day_record.orario_apertura)) / 3600;
    END IF;
  END LOOP;

  RETURN total_hours;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE opening_hours IS 'Orari di apertura settimanali del centro';
COMMENT ON TABLE exceptional_closures IS 'Chiusure eccezionali come festività e ferie';
COMMENT ON TABLE validated_anomalies IS 'Anomalie rilevate e il loro stato di validazione';
