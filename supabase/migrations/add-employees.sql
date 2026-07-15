-- Tabelle per Gestione Dipendenti (HR Module)
-- Permette tracking dipendenti, ore lavorate, straordinari, ferie e assenze

-- Tabella anagrafica dipendenti
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  ore_contrattuali_settimanali DECIMAL(5,2) DEFAULT 40,
  data_assunzione DATE,
  data_cessazione DATE,
  ruolo VARCHAR(100),
  email VARCHAR(255),
  telefono VARCHAR(50),
  note TEXT,
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabella tracciamento ore lavorate
CREATE TABLE IF NOT EXISTS employee_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ore_lavorate DECIMAL(5,2) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'normale',
  note TEXT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(employee_id, data)
);

-- Tabella assenze dipendenti
CREATE TABLE IF NOT EXISTS employee_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  ore_totali DECIMAL(5,2),
  approvato BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_employees_centro ON employees(centro_id);
CREATE INDEX IF NOT EXISTS idx_employees_attivo ON employees(attivo);
CREATE INDEX IF NOT EXISTS idx_employees_cognome ON employees(cognome);
CREATE INDEX IF NOT EXISTS idx_employee_hours_employee ON employee_hours(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_hours_data ON employee_hours(data);
CREATE INDEX IF NOT EXISTS idx_employee_absences_employee ON employee_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_absences_dates ON employee_absences(data_inizio, data_fine);
CREATE INDEX IF NOT EXISTS idx_employee_absences_tipo ON employee_absences(tipo);

-- Function per auto-update updated_at employees
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update employees
CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

-- Function per auto-update updated_at absences
CREATE OR REPLACE FUNCTION update_employee_absences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update absences
CREATE TRIGGER employee_absences_updated_at
BEFORE UPDATE ON employee_absences
FOR EACH ROW
EXECUTE FUNCTION update_employee_absences_updated_at();

-- Constraint per validare date assenze
ALTER TABLE employee_absences
ADD CONSTRAINT check_absence_dates CHECK (data_fine >= data_inizio);
