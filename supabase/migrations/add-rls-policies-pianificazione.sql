-- ==========================================
-- RLS POLICIES PER PIANIFICAZIONE
-- ==========================================

-- CUSTOM CATEGORIES - Aggiungi policy se non esiste
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
