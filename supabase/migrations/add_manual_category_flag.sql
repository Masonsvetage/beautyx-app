-- Aggiunge flag per tracciare categorizzazioni manuali
ALTER TABLE bank_movements
ADD COLUMN IF NOT EXISTS categorized_manually BOOLEAN DEFAULT FALSE;

-- Commento per documentazione
COMMENT ON COLUMN bank_movements.categorized_manually IS 'Indica se la categoria è stata impostata manualmente dall''utente. Se TRUE, le regole auto-categorizzazione non sovrascriveranno questa categoria.';
