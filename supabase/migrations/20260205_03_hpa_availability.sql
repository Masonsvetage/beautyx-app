-- =====================================================
-- Migration: HPA Availability & Appointments
-- Data: 2026-02-05
-- Descrizione: Sistema disponibilità HPA e prenotazione call
-- =====================================================

-- 1. Tabella slot disponibilità settimanale HPA
CREATE TABLE IF NOT EXISTS hpa_availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hpa_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  giorno_settimana INTEGER NOT NULL CHECK (giorno_settimana BETWEEN 0 AND 6), -- 0=Lunedì, 6=Domenica
  ora_inizio TIME NOT NULL,
  ora_fine TIME NOT NULL,
  durate_disponibili INTEGER[] DEFAULT '{15,30,45,60}', -- durate prenotabili in minuti
  attivo BOOLEAN DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_hpa_day UNIQUE(hpa_id, giorno_settimana),
  CONSTRAINT valid_time_range CHECK (ora_fine > ora_inizio)
);

-- 2. Tabella eccezioni disponibilità (giorni specifici non disponibili)
CREATE TABLE IF NOT EXISTS hpa_availability_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hpa_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  data_eccezione DATE NOT NULL,
  tipo VARCHAR(20) DEFAULT 'non_disponibile' CHECK (tipo IN ('non_disponibile', 'orario_speciale')),
  ora_inizio TIME, -- solo per orario_speciale
  ora_fine TIME,   -- solo per orario_speciale
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_hpa_exception_date UNIQUE(hpa_id, data_eccezione)
);

-- 3. Tabella appuntamenti prenotati
CREATE TABLE IF NOT EXISTS hpa_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hpa_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  data_appuntamento DATE NOT NULL,
  ora_inizio TIME NOT NULL,
  ora_fine TIME NOT NULL,
  durata_minuti INTEGER NOT NULL CHECK (durata_minuti IN (15, 30, 45, 60)),
  stato VARCHAR(30) DEFAULT 'confermato' CHECK (stato IN ('pending', 'confermato', 'completato', 'cancellato', 'no_show')),
  tipo VARCHAR(30) DEFAULT 'call' CHECK (tipo IN ('call', 'chat', 'in_persona')),
  note TEXT,
  -- Tracking chiamata
  minuti_consumati INTEGER,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  -- Cancellazione
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES user_profiles(id),
  cancelled_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- Nota: la verifica sovrapposizioni è gestita dalla funzione book_appointment()
);

-- 4. Indici per performance
CREATE INDEX IF NOT EXISTS idx_availability_hpa ON hpa_availability_slots(hpa_id, giorno_settimana) WHERE attivo = TRUE;
CREATE INDEX IF NOT EXISTS idx_exceptions_hpa_date ON hpa_availability_exceptions(hpa_id, data_eccezione);
CREATE INDEX IF NOT EXISTS idx_appointments_hpa_date ON hpa_appointments(hpa_id, data_appuntamento, stato);
CREATE INDEX IF NOT EXISTS idx_appointments_centro ON hpa_appointments(centro_id, data_appuntamento);
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON hpa_appointments(data_appuntamento, ora_inizio) WHERE stato = 'confermato';

-- 5. RLS Policies per availability_slots
ALTER TABLE hpa_availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HPA can manage own availability" ON hpa_availability_slots
  FOR ALL TO authenticated
  USING (hpa_id = auth.uid());

CREATE POLICY "Anyone can view HPA availability" ON hpa_availability_slots
  FOR SELECT TO authenticated
  USING (attivo = TRUE);

-- 6. RLS Policies per exceptions
ALTER TABLE hpa_availability_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HPA can manage own exceptions" ON hpa_availability_exceptions
  FOR ALL TO authenticated
  USING (hpa_id = auth.uid());

CREATE POLICY "Anyone can view HPA exceptions" ON hpa_availability_exceptions
  FOR SELECT TO authenticated
  USING (TRUE);

-- 7. RLS Policies per appointments
ALTER TABLE hpa_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all appointments" ON hpa_appointments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

CREATE POLICY "HPA can manage own appointments" ON hpa_appointments
  FOR ALL TO authenticated
  USING (hpa_id = auth.uid());

CREATE POLICY "Client can view/create own center appointments" ON hpa_appointments
  FOR ALL TO authenticated
  USING (
    centro_id IN (
      SELECT up.centro_id FROM user_profiles up WHERE up.id = auth.uid()
    )
  );

-- 8. Funzione per ottenere slot disponibili per una data
CREATE OR REPLACE FUNCTION get_available_slots(
  p_hpa_id UUID,
  p_date DATE,
  p_durata INTEGER DEFAULT 30
)
RETURNS TABLE (
  ora_inizio TIME,
  ora_fine TIME,
  disponibile BOOLEAN
) AS $$
DECLARE
  v_giorno_settimana INTEGER;
  v_slot RECORD;
  v_current_time TIME;
  v_slot_end TIME;
BEGIN
  -- Calcola giorno della settimana (0=Lunedì in PostgreSQL con ISODOW - 1)
  v_giorno_settimana := EXTRACT(ISODOW FROM p_date)::INTEGER - 1;

  -- Controlla eccezioni
  IF EXISTS (
    SELECT 1 FROM hpa_availability_exceptions
    WHERE hpa_id = p_hpa_id
    AND data_eccezione = p_date
    AND tipo = 'non_disponibile'
  ) THEN
    -- Giorno non disponibile
    RETURN;
  END IF;

  -- Ottieni slot per il giorno
  FOR v_slot IN
    SELECT has.ora_inizio as slot_start, has.ora_fine as slot_end
    FROM hpa_availability_slots has
    WHERE has.hpa_id = p_hpa_id
    AND has.giorno_settimana = v_giorno_settimana
    AND has.attivo = TRUE
    AND p_durata = ANY(has.durate_disponibili)
  LOOP
    v_current_time := v_slot.slot_start;

    -- Genera slot ogni 15 minuti
    WHILE v_current_time + (p_durata || ' minutes')::INTERVAL <= v_slot.slot_end LOOP
      v_slot_end := v_current_time + (p_durata || ' minutes')::INTERVAL;

      -- Controlla se slot è già prenotato
      ora_inizio := v_current_time;
      ora_fine := v_slot_end;
      disponibile := NOT EXISTS (
        SELECT 1 FROM hpa_appointments ha
        WHERE ha.hpa_id = p_hpa_id
        AND ha.data_appuntamento = p_date
        AND ha.stato NOT IN ('cancellato')
        AND (
          (ha.ora_inizio < v_slot_end AND ha.ora_fine > v_current_time)
        )
      );

      RETURN NEXT;

      v_current_time := v_current_time + '15 minutes'::INTERVAL;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Funzione per prenotare un appuntamento
CREATE OR REPLACE FUNCTION book_appointment(
  p_hpa_id UUID,
  p_centro_id UUID,
  p_date DATE,
  p_ora_inizio TIME,
  p_durata INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_appointment_id UUID;
  v_ora_fine TIME;
BEGIN
  v_ora_fine := p_ora_inizio + (p_durata || ' minutes')::INTERVAL;

  -- Verifica disponibilità
  IF NOT EXISTS (
    SELECT 1 FROM get_available_slots(p_hpa_id, p_date, p_durata) s
    WHERE s.ora_inizio = p_ora_inizio AND s.disponibile = TRUE
  ) THEN
    RAISE EXCEPTION 'Slot non disponibile';
  END IF;

  -- Crea appuntamento
  INSERT INTO hpa_appointments (
    hpa_id, centro_id, data_appuntamento, ora_inizio, ora_fine, durata_minuti, note
  ) VALUES (
    p_hpa_id, p_centro_id, p_date, p_ora_inizio, v_ora_fine, p_durata, p_note
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger per updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_availability_updated ON hpa_availability_slots;
CREATE TRIGGER trigger_availability_updated
  BEFORE UPDATE ON hpa_availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_appointments_updated ON hpa_appointments;
CREATE TRIGGER trigger_appointments_updated
  BEFORE UPDATE ON hpa_appointments
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 11. Vista appuntamenti imminenti per HPA
CREATE OR REPLACE VIEW hpa_upcoming_appointments AS
SELECT
  ha.id,
  ha.hpa_id,
  ha.centro_id,
  bc.nome as centro_nome,
  ha.data_appuntamento,
  ha.ora_inizio,
  ha.ora_fine,
  ha.durata_minuti,
  ha.stato,
  ha.tipo,
  ha.note,
  (ha.data_appuntamento || ' ' || ha.ora_inizio)::timestamp as datetime_inizio
FROM hpa_appointments ha
JOIN beauty_centers bc ON bc.id = ha.centro_id
WHERE ha.stato = 'confermato'
AND ha.data_appuntamento >= CURRENT_DATE
ORDER BY ha.data_appuntamento, ha.ora_inizio;

COMMENT ON TABLE hpa_availability_slots IS 'Configurazione disponibilità settimanale HPA';
COMMENT ON TABLE hpa_availability_exceptions IS 'Eccezioni alla disponibilità HPA (ferie, impegni)';
COMMENT ON TABLE hpa_appointments IS 'Appuntamenti prenotati tra HPA e clienti';
COMMENT ON FUNCTION get_available_slots IS 'Restituisce slot disponibili per prenotazione';
COMMENT ON FUNCTION book_appointment IS 'Prenota un appuntamento verificando disponibilità';
