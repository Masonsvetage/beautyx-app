-- =====================================================
-- MIGRAZIONE 007: Campi completi profilo utente
-- Esegui in Supabase Dashboard > SQL Editor
-- =====================================================

-- Tipo soggetto
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tipo_soggetto VARCHAR(20) DEFAULT 'persona_fisica';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ragione_sociale VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tipo_societa VARCHAR(50);

-- Dati anagrafici
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS data_nascita DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS luogo_nascita VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS codice_fiscale VARCHAR(16);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS partita_iva VARCHAR(11);

-- Recapiti
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cellulare VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telefono_fisso VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pec VARCHAR(100);

-- Residenza
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_nazione VARCHAR(50) DEFAULT 'Italia';

-- Domicilio
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_diverso BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_nazione VARCHAR(50) DEFAULT 'Italia';

-- Documento (se non già aggiunti dalla migrazione 006)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_tipo VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_numero VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_rilasciato_da VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_rilascio DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_scadenza DATE;

-- Professionale
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS professione VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS azienda VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sito_web VARCHAR(255);

-- Commenti
COMMENT ON COLUMN user_profiles.tipo_soggetto IS 'persona_fisica o societa';
COMMENT ON COLUMN user_profiles.ragione_sociale IS 'Ragione sociale (se societa)';
COMMENT ON COLUMN user_profiles.tipo_societa IS 'Tipo di societa (SRL, SRLS, SAS, etc.)';
COMMENT ON COLUMN user_profiles.codice_fiscale IS 'Codice fiscale (16 caratteri)';
COMMENT ON COLUMN user_profiles.partita_iva IS 'Partita IVA (11 cifre)';
COMMENT ON COLUMN user_profiles.domicilio_diverso IS 'Se true, il domicilio e diverso dalla residenza';

-- =====================================================
-- POLICY RLS per permettere aggiornamento profilo
-- =====================================================

-- Rimuovi policy esistente se presente (per evitare errori)
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Crea policy per permettere agli utenti di aggiornare il proprio profilo
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy per permettere agli utenti di leggere il proprio profilo
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy per admin che possono vedere e modificare tutti i profili
DROP POLICY IF EXISTS "Admin can do everything on profiles" ON user_profiles;
CREATE POLICY "Admin can do everything on profiles"
ON user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND ruolo_livello = 'admin'
  )
);

SELECT 'Migrazione 007 completata!' as status;
