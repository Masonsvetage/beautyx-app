-- ==========================================
-- INSTALLAZIONE COMPLETA MODULO PIANIFICAZIONE
-- Esegui questo file una sola volta su Supabase SQL Editor
-- ==========================================

-- ==========================================
-- PARTE 1: BUDGET PLANNING TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  categoria VARCHAR(100) NOT NULL,
  anno INTEGER NOT NULL,
  importo_annuale DECIMAL(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(centro_id, categoria, anno)
);

CREATE TABLE IF NOT EXISTS budget_monthly_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_plan_id UUID NOT NULL REFERENCES budget_plans(id) ON DELETE CASCADE,
  mese INTEGER NOT NULL CHECK (mese >= 1 AND mese <= 12),
  importo_mensile DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(budget_plan_id, mese)
);

CREATE INDEX IF NOT EXISTS idx_budget_plans_centro ON budget_plans(centro_id);
CREATE INDEX IF NOT EXISTS idx_budget_plans_anno ON budget_plans(anno);
CREATE INDEX IF NOT EXISTS idx_budget_plans_categoria ON budget_plans(categoria);
CREATE INDEX IF NOT EXISTS idx_budget_monthly_budget_id ON budget_monthly_breakdown(budget_plan_id);
CREATE INDEX IF NOT EXISTS idx_budget_monthly_mese ON budget_monthly_breakdown(mese);

CREATE OR REPLACE FUNCTION update_budget_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budget_plans_updated_at ON budget_plans;
CREATE TRIGGER budget_plans_updated_at
BEFORE UPDATE ON budget_plans
FOR EACH ROW
EXECUTE FUNCTION update_budget_plans_updated_at();

-- ==========================================
-- PARTE 2: ACCANTONAMENTI TABLES
-- ==========================================

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

-- Aggiungi colonne mancanti se la tabella esisteva già
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'attivo'
  ) THEN
    ALTER TABLE accantonamenti ADD COLUMN attivo BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'categoria_collegata'
  ) THEN
    ALTER TABLE accantonamenti ADD COLUMN categoria_collegata VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'contributo_mensile'
  ) THEN
    ALTER TABLE accantonamenti ADD COLUMN contributo_mensile DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'colore'
  ) THEN
    ALTER TABLE accantonamenti ADD COLUMN colore VARCHAR(7) DEFAULT '#8b5cf6';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accantonamenti' AND column_name = 'icona'
  ) THEN
    ALTER TABLE accantonamenti ADD COLUMN icona VARCHAR(10) DEFAULT '💰';
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_accantonamenti_centro ON accantonamenti(centro_id);
CREATE INDEX IF NOT EXISTS idx_accantonamenti_attivo ON accantonamenti(attivo);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_acc_id ON accantonamento_movements(accantonamento_id);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_data ON accantonamento_movements(data);
CREATE INDEX IF NOT EXISTS idx_accantonamento_movements_bank_id ON accantonamento_movements(bank_movement_id);

CREATE OR REPLACE FUNCTION update_accantonamenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accantonamenti_updated_at ON accantonamenti;
CREATE TRIGGER accantonamenti_updated_at
BEFORE UPDATE ON accantonamenti
FOR EACH ROW
EXECUTE FUNCTION update_accantonamenti_updated_at();

CREATE OR REPLACE FUNCTION update_accantonamento_saldo()
RETURNS TRIGGER AS $$
DECLARE
  nuovo_saldo DECIMAL(10,2);
BEGIN
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

  UPDATE accantonamenti
  SET saldo_attuale = nuovo_saldo
  WHERE id = COALESCE(NEW.accantonamento_id, OLD.accantonamento_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accantonamento_movement_inserted ON accantonamento_movements;
CREATE TRIGGER accantonamento_movement_inserted
AFTER INSERT ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

DROP TRIGGER IF EXISTS accantonamento_movement_deleted ON accantonamento_movements;
CREATE TRIGGER accantonamento_movement_deleted
AFTER DELETE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

DROP TRIGGER IF EXISTS accantonamento_movement_updated ON accantonamento_movements;
CREATE TRIGGER accantonamento_movement_updated
AFTER UPDATE ON accantonamento_movements
FOR EACH ROW
EXECUTE FUNCTION update_accantonamento_saldo();

-- ==========================================
-- PARTE 3: EMPLOYEES TABLES
-- ==========================================

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

-- Aggiungi colonne mancanti se la tabella esisteva già
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'attivo'
  ) THEN
    ALTER TABLE employees ADD COLUMN attivo BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'ore_contrattuali_settimanali'
  ) THEN
    ALTER TABLE employees ADD COLUMN ore_contrattuali_settimanali DECIMAL(5,2) DEFAULT 40;
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_employees_centro ON employees(centro_id);
CREATE INDEX IF NOT EXISTS idx_employees_attivo ON employees(attivo);
CREATE INDEX IF NOT EXISTS idx_employees_cognome ON employees(cognome);
CREATE INDEX IF NOT EXISTS idx_employee_hours_employee ON employee_hours(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_hours_data ON employee_hours(data);
CREATE INDEX IF NOT EXISTS idx_employee_absences_employee ON employee_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_absences_dates ON employee_absences(data_inizio, data_fine);
CREATE INDEX IF NOT EXISTS idx_employee_absences_tipo ON employee_absences(tipo);

CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_employees_updated_at();

CREATE OR REPLACE FUNCTION update_employee_absences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employee_absences_updated_at ON employee_absences;
CREATE TRIGGER employee_absences_updated_at
BEFORE UPDATE ON employee_absences
FOR EACH ROW
EXECUTE FUNCTION update_employee_absences_updated_at();

ALTER TABLE employee_absences
DROP CONSTRAINT IF EXISTS check_absence_dates;

ALTER TABLE employee_absences
ADD CONSTRAINT check_absence_dates CHECK (data_fine >= data_inizio);

-- ==========================================
-- PARTE 4: RLS POLICIES
-- ==========================================

-- CUSTOM CATEGORIES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_categories'
    AND policyname = 'Allow all operations on custom_categories'
  ) THEN
    CREATE POLICY "Allow all operations on custom_categories"
    ON custom_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- BUDGET PLANS
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on budget_plans" ON budget_plans;
CREATE POLICY "Allow all operations on budget_plans"
ON budget_plans
FOR ALL
USING (true)
WITH CHECK (true);

-- BUDGET MONTHLY BREAKDOWN
ALTER TABLE budget_monthly_breakdown ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on budget_monthly_breakdown" ON budget_monthly_breakdown;
CREATE POLICY "Allow all operations on budget_monthly_breakdown"
ON budget_monthly_breakdown
FOR ALL
USING (true)
WITH CHECK (true);

-- ACCANTONAMENTI
ALTER TABLE accantonamenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on accantonamenti" ON accantonamenti;
CREATE POLICY "Allow all operations on accantonamenti"
ON accantonamenti
FOR ALL
USING (true)
WITH CHECK (true);

-- ACCANTONAMENTO MOVEMENTS
ALTER TABLE accantonamento_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on accantonamento_movements" ON accantonamento_movements;
CREATE POLICY "Allow all operations on accantonamento_movements"
ON accantonamento_movements
FOR ALL
USING (true)
WITH CHECK (true);

-- EMPLOYEES
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on employees" ON employees;
CREATE POLICY "Allow all operations on employees"
ON employees
FOR ALL
USING (true)
WITH CHECK (true);

-- EMPLOYEE HOURS
ALTER TABLE employee_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on employee_hours" ON employee_hours;
CREATE POLICY "Allow all operations on employee_hours"
ON employee_hours
FOR ALL
USING (true)
WITH CHECK (true);

-- EMPLOYEE ABSENCES
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on employee_absences" ON employee_absences;
CREATE POLICY "Allow all operations on employee_absences"
ON employee_absences
FOR ALL
USING (true)
WITH CHECK (true);

-- ==========================================
-- INSTALLAZIONE COMPLETATA!
-- ==========================================
-- Verifica che tutte le tabelle siano state create:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('budget_plans', 'budget_monthly_breakdown', 'accantonamenti',
--                    'accantonamento_movements', 'employees', 'employee_hours',
--                    'employee_absences');
