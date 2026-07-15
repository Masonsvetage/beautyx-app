-- =====================================================
-- STEP 2: Aggiungi colonne a user_profiles
-- Esegui DOPO lo STEP 1
-- =====================================================

-- Dati anagrafici base
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS data_nascita DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS luogo_nascita VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS codice_fiscale VARCHAR(16);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS partita_iva VARCHAR(11);

-- Recapiti
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telefono_fisso VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cellulare VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pec VARCHAR(255);

-- Residenza
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_nazione VARCHAR(50);

-- Domicilio
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_diverso BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_nazione VARCHAR(50);

-- Documento
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_tipo VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_numero VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_rilasciato_da VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_rilascio DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_scadenza DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_scan_fronte_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_scan_retro_url TEXT;

-- Professionali
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS professione VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS azienda VARCHAR(150);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sito_web VARCHAR(255);

-- Note
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS note_interne TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Organization
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Verifica
SELECT 'Colonne user_profiles aggiunte!' as status;
