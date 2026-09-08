-- =====================================================
-- FIX: schema drift su user_profiles nel progetto Supabase di produzione
-- (scfumedmisbuxhdywwpb, migrato il 17/07/2026)
-- Applicata DIRETTAMENTE in produzione il 07/09/2026 (Davide, via
-- apply_migration MCP, nome "fix_user_profiles_schema_drift_20260907")
-- durante l'indagine sul bug "questionario bloccato all'infinito nonostante
-- centro creato con successo (201)". Questo file è il record nel repo di
-- quanto già eseguito live — NON va ri-eseguito a mano, è idempotente
-- (IF NOT EXISTS / OR REPLACE / DROP...IF EXISTS ovunque) ma è già applicato.
-- =====================================================
--
-- CAUSA REALE TROVATA (query dirette al DB, non ipotesi):
-- 1. user_profiles su questo progetto aveva uno schema molto più vecchio di
--    quello assunto dal codice (mancavano piano, ruolo_livello,
--    parent_user_id, updated_at, avatar_url, partita_iva e ~15 campi
--    anagrafici usati da AuthContext.js signUp()) e un extra `auth_user_id`
--    mai usato da nessuna parte del codice (che usa sempre `id = auth.uid()`).
-- 2. Il CHECK su `ruolo` ammetteva solo ('admin','hpa','owner'), ma tutto il
--    codice scrive 'centro' -> ogni tentativo di creare/upsertare un profilo
--    falliva SEMPRE con una violazione di vincolo.
-- 3. RLS abilitata su user_profiles ma ZERO policy definite -> deny-all
--    totale anche per il proprietario della riga (letture/scritture lato
--    client sempre vuote, indipendentemente da 1 e 2).
-- 4. Nessun trigger `on_auth_user_created`/`handle_new_user()` su
--    auth.users (assente su questo progetto) -> nessun meccanismo lato
--    server per creare automaticamente la riga profilo alla registrazione.
--
-- Risultato: `user_profiles` aveva 0 righe (confermato via `count(*)`)
-- nonostante `auth.users` avesse account reali — ogni signup falliva in
-- silenzio (solo `console.error`, mai mostrato all'utente). Di conseguenza
-- `centroId` lato client (contexts/AuthContext.js) restava sempre `null`,
-- e app/api/onboarding/create-centro/route.js creava centri "orfani" in
-- beauty_centers senza mai riuscire a collegarli (la UPDATE su
-- user_profiles WHERE id=user.id affetava 0 righe, senza errore).
--
-- Vedi anche i file già scritti nel repo ma mai eseguiti su questo
-- specifico progetto (stessa causa radice, stesso pattern già documentato
-- in memory/davide.md 29/08/2026 per altre tabelle): 003_user_profiles_
-- anagrafica_completa.sql, 003b/003d/003e/003f_STEP*, 004_add_tipo_
-- soggetto.sql, 005_add_updated_at_user_profiles.sql,
-- 007_profilo_campi_completi.sql, ESEGUI_add_avatar_url_user_profiles.sql,
-- fix_ruolo_check_constraint.sql. Questo file ne è una consolidazione
-- mirata (solo le colonne/vincoli/trigger/RLS realmente necessari a
-- sbloccare signup + /questionario), non una sostituzione: gli altri file
-- restano nel repo per riferimento storico.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS piano VARCHAR(20) DEFAULT 'demo';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ruolo_livello VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS partita_iva VARCHAR(11);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tipo_soggetto VARCHAR(20) DEFAULT 'persona_fisica';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ragione_sociale VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tipo_societa VARCHAR(50);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS codice_fiscale VARCHAR(16);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cellulare VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telefono_fisso VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pec VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS residenza_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_diverso BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_indirizzo VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_civico VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_cap VARCHAR(5);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_citta VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS domicilio_provincia VARCHAR(2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_tipo VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_numero VARCHAR(30);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS documento_data_scadenza DATE;

UPDATE user_profiles
SET ruolo_livello = CASE
  WHEN ruolo = 'admin' THEN 'admin'
  WHEN ruolo = 'hpa' THEN 'hpa'
  ELSE 'titolare'
END
WHERE ruolo_livello IS NULL;

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_ruolo_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_ruolo_check
  CHECK (ruolo IN ('centro', 'hpa', 'admin'));

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
CREATE POLICY "Admin can view all profiles" ON user_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (ruolo = 'admin' OR ruolo_livello = 'admin'))
  );

DROP POLICY IF EXISTS "Admin can update all profiles" ON user_profiles;
CREATE POLICY "Admin can update all profiles" ON user_profiles
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (ruolo = 'admin' OR ruolo_livello = 'admin'))
  );

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, ruolo, ruolo_livello, piano, attivo)
    VALUES (NEW.id, NEW.email, 'centro', 'titolare', 'demo', TRUE)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Errore creazione profilo per %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- =====================================================
-- DATI: backfill dell'account di Mason (luigixri@gmail.com), rotto da prima
-- di questo fix. Eseguito live separatamente via execute_sql, riportato qui
-- solo per tracciabilità (NON idempotente in modo pulito - usa un id fisso -
-- per questo è fuori dal corpo della migration vera e propria, a titolo di
-- riferimento):
--
-- insert into user_profiles (id, email, nome, cognome, ruolo, ruolo_livello, piano, attivo, centro_id)
-- values ('89489082-d8bd-4d1f-bc6d-9317259c027d', 'luigixri@gmail.com', 'Luigi', 'Perri',
--         'centro', 'titolare', 'demo', true, '8fa1fbf6-e7ce-40e8-9130-4ef2b4af7ff2')
-- on conflict (id) do update set centro_id = excluded.centro_id;
--
-- NOTA per Mason: esistono ORA due righe orfane in beauty_centers create
-- dagli stessi test rotti prima del fix: "Svetage" (06/09/2026) e "Centro
-- Test Mason" (07/09/2026, oggi). Ho collegato il tuo profilo a "Centro Test
-- Mason" (il più recente, quello del test di oggi). "Svetage" resta
-- scollegata da qualunque account: decidi tu se eliminarla o riassegnarla.
