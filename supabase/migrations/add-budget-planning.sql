-- Tabelle per Budget Planning
-- Permette pianificazione annuale e mensile del budget per categoria

-- Tabella budget annuali per categoria
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

-- Tabella breakdown mensili budget
CREATE TABLE IF NOT EXISTS budget_monthly_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_plan_id UUID NOT NULL REFERENCES budget_plans(id) ON DELETE CASCADE,
  mese INTEGER NOT NULL CHECK (mese >= 1 AND mese <= 12),
  importo_mensile DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(budget_plan_id, mese)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_budget_plans_centro ON budget_plans(centro_id);
CREATE INDEX IF NOT EXISTS idx_budget_plans_anno ON budget_plans(anno);
CREATE INDEX IF NOT EXISTS idx_budget_plans_categoria ON budget_plans(categoria);
CREATE INDEX IF NOT EXISTS idx_budget_monthly_budget_id ON budget_monthly_breakdown(budget_plan_id);
CREATE INDEX IF NOT EXISTS idx_budget_monthly_mese ON budget_monthly_breakdown(mese);

-- Function per auto-update updated_at
CREATE OR REPLACE FUNCTION update_budget_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per auto-update
CREATE TRIGGER budget_plans_updated_at
BEFORE UPDATE ON budget_plans
FOR EACH ROW
EXECUTE FUNCTION update_budget_plans_updated_at();
