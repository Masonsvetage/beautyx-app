-- =====================================================
-- MIGRAZIONE 004: Aggiunta tipo_soggetto a user_profiles
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- Tipo soggetto: persona fisica o societa
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tipo_soggetto VARCHAR(20) DEFAULT 'persona_fisica';

-- Ragione sociale (per societa)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ragione_sociale VARCHAR(255);

-- Tipo societa (SRL, SAS, SNC, etc.)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tipo_societa VARCHAR(30);

-- Commento
COMMENT ON COLUMN user_profiles.tipo_soggetto IS 'persona_fisica o societa';
COMMENT ON COLUMN user_profiles.ragione_sociale IS 'Ragione sociale (solo per societa)';
COMMENT ON COLUMN user_profiles.tipo_societa IS 'Tipo societa: SRL, SAS, SNC, SRLS, SPA, SAPA, SS, Ditta Individuale, Altro';

SELECT 'Migrazione 004 completata!' as status;
