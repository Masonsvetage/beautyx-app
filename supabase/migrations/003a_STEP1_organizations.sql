-- =====================================================
-- STEP 1: Crea tabella organizations (se non esiste)
-- Esegui PRIMA questo, poi passa allo STEP 2
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descrizione TEXT,
    logo_url TEXT,
    sede_principale_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Verifica
SELECT 'Tabella organizations creata/esistente!' as status;
