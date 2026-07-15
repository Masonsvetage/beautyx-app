-- =====================================================
-- SISTEMA PERMESSI GERARCHICO BEAUTYX
-- Migrazione completa per gestione utenti e permessi
-- =====================================================

-- =====================================================
-- PARTE 1: ENUM E TIPI
-- =====================================================

-- Livelli di ruolo (gerarchia)
DO $$ BEGIN
    CREATE TYPE user_role_level AS ENUM (
        'admin',           -- Livello 0: Amministratore sistema
        'hpa',             -- Livello 1: Consulente HPA
        'titolare',        -- Livello 2: Titolare/Responsabile centri
        'direttore',       -- Livello 3: Direttore di sede
        'amministrativo'   -- Livello 3: Responsabile amministrativo
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Categorie funzioni app
DO $$ BEGIN
    CREATE TYPE function_category AS ENUM (
        'dashboard',
        'movimenti',
        'analytics',
        'obiettivi',
        'pianificazione',
        'clienti',
        'servizi',
        'beautyx_chat',
        'impostazioni',
        'gestione_utenti',
        'gestione_centri',
        'report',
        'contabilita',
        'banca'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PARTE 2: TABELLA FUNZIONI APP
-- =====================================================

CREATE TABLE IF NOT EXISTS app_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codice TEXT NOT NULL UNIQUE,  -- es: 'movimenti.visualizza', 'movimenti.inserisci'
    nome TEXT NOT NULL,
    descrizione TEXT,
    categoria function_category NOT NULL,
    -- Permessi di default per ogni ruolo (TRUE = abilitato di default)
    default_admin BOOLEAN DEFAULT TRUE,
    default_hpa BOOLEAN DEFAULT TRUE,
    default_titolare BOOLEAN DEFAULT TRUE,
    default_direttore BOOLEAN DEFAULT FALSE,
    default_amministrativo BOOLEAN DEFAULT FALSE,
    -- Può essere modificato da questi ruoli
    modificabile_da_admin BOOLEAN DEFAULT TRUE,
    modificabile_da_hpa BOOLEAN DEFAULT FALSE,
    -- Metadata
    ordine INT DEFAULT 0,
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 3: MODIFICA USER_PROFILES PER GERARCHIA
-- =====================================================

-- Aggiungi colonne per gerarchia
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS ruolo_livello user_role_level DEFAULT 'titolare',
    ADD COLUMN IF NOT EXISTS hpa_assegnato_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_parent ON user_profiles(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hpa ON user_profiles(hpa_assegnato_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_ruolo_livello ON user_profiles(ruolo_livello);

-- =====================================================
-- PARTE 4: OVERRIDE PERMESSI PERSONALIZZATI
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES app_functions(id) ON DELETE CASCADE,
    -- Override del permesso
    abilitato BOOLEAN NOT NULL,
    -- Chi ha fatto l'override
    impostato_da UUID REFERENCES user_profiles(id),
    impostato_da_ruolo user_role_level,
    motivo TEXT,
    -- Validità temporale (opzionale)
    valido_da DATE DEFAULT CURRENT_DATE,
    valido_fino DATE,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, function_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_overrides_user ON user_permission_overrides(user_id);

-- =====================================================
-- PARTE 5: ASSOCIAZIONE UTENTI-CENTRI MIGLIORATA
-- =====================================================

CREATE TABLE IF NOT EXISTS user_centro_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
    -- Tipo di accesso
    tipo_accesso TEXT NOT NULL CHECK (tipo_accesso IN ('titolare', 'direttore', 'amministrativo', 'hpa')),
    -- Per direttori: è la sede principale?
    is_sede_principale BOOLEAN DEFAULT FALSE,
    -- Permessi specifici per questo centro (override)
    permessi_centro JSONB DEFAULT '{}',
    -- Validità
    attivo BOOLEAN DEFAULT TRUE,
    data_inizio DATE DEFAULT CURRENT_DATE,
    data_fine DATE,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id),
    UNIQUE(user_id, centro_id, tipo_accesso)
);

CREATE INDEX IF NOT EXISTS idx_user_centro_access_user ON user_centro_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_centro_access_centro ON user_centro_access(centro_id);

-- =====================================================
-- PARTE 6: LOG MODIFICHE PERMESSI (AUDIT)
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    function_id UUID,
    azione TEXT NOT NULL, -- 'grant', 'revoke', 'modify'
    valore_precedente BOOLEAN,
    valore_nuovo BOOLEAN,
    eseguito_da UUID NOT NULL,
    eseguito_da_ruolo user_role_level,
    ip_address TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_date ON permission_audit_log(created_at);

-- =====================================================
-- PARTE 7: POPOLAMENTO FUNZIONI APP
-- =====================================================

INSERT INTO app_functions (codice, nome, descrizione, categoria, default_admin, default_hpa, default_titolare, default_direttore, default_amministrativo, modificabile_da_hpa, ordine) VALUES
-- Dashboard
('dashboard.visualizza', 'Visualizza Dashboard', 'Accesso alla dashboard principale', 'dashboard', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 1),
('dashboard.widget_fatturato', 'Widget Fatturato', 'Vedere il widget del fatturato', 'dashboard', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 2),
('dashboard.widget_obiettivi', 'Widget Obiettivi', 'Vedere il widget degli obiettivi', 'dashboard', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 3),

-- Movimenti
('movimenti.visualizza', 'Visualizza Movimenti', 'Vedere lista movimenti bancari', 'movimenti', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 10),
('movimenti.inserisci', 'Inserisci Movimenti', 'Aggiungere nuovi movimenti', 'movimenti', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 11),
('movimenti.modifica', 'Modifica Movimenti', 'Modificare movimenti esistenti', 'movimenti', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 12),
('movimenti.elimina', 'Elimina Movimenti', 'Eliminare movimenti', 'movimenti', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 13),
('movimenti.importa', 'Importa Movimenti', 'Importare movimenti da file', 'movimenti', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 14),
('movimenti.esporta', 'Esporta Movimenti', 'Esportare movimenti', 'movimenti', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 15),

-- Analytics
('analytics.visualizza', 'Visualizza Analytics', 'Accesso alle analisi', 'analytics', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 20),
('analytics.report_avanzati', 'Report Avanzati', 'Accesso ai report avanzati', 'analytics', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 21),
('analytics.confronto_periodi', 'Confronto Periodi', 'Confrontare periodi diversi', 'analytics', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 22),
('analytics.benchmark', 'Benchmark', 'Vedere benchmark di settore', 'analytics', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, 23),

-- Obiettivi
('obiettivi.visualizza', 'Visualizza Obiettivi', 'Vedere gli obiettivi', 'obiettivi', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 30),
('obiettivi.crea', 'Crea Obiettivi', 'Creare nuovi obiettivi', 'obiettivi', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 31),
('obiettivi.modifica', 'Modifica Obiettivi', 'Modificare obiettivi', 'obiettivi', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 32),
('obiettivi.approva', 'Approva Obiettivi', 'Approvare obiettivi suggeriti', 'obiettivi', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 33),

-- Pianificazione
('pianificazione.visualizza', 'Visualizza Pianificazione', 'Accesso alla pianificazione', 'pianificazione', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 40),
('pianificazione.modifica', 'Modifica Pianificazione', 'Modificare la pianificazione', 'pianificazione', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 41),

-- Beautyx Chat
('beautyx.chat', 'Chat Beautyx', 'Usare la chat AI Beautyx', 'beautyx_chat', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 50),
('beautyx.suggerimenti', 'Suggerimenti Beautyx', 'Ricevere suggerimenti AI', 'beautyx_chat', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 51),
('beautyx.analisi_dati', 'Analisi Dati Beautyx', 'Beautyx può analizzare i dati', 'beautyx_chat', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 52),
('beautyx.dati_sensibili', 'Dati Sensibili Beautyx', 'Beautyx può accedere a dati sensibili (conti, etc)', 'beautyx_chat', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 53),

-- Contabilità
('contabilita.visualizza', 'Visualizza Contabilità', 'Accesso alla contabilità', 'contabilita', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 60),
('contabilita.modifica', 'Modifica Contabilità', 'Modificare dati contabili', 'contabilita', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 61),
('contabilita.chiusure', 'Chiusure Contabili', 'Effettuare chiusure', 'contabilita', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 62),

-- Banca
('banca.visualizza_saldi', 'Visualizza Saldi', 'Vedere i saldi bancari', 'banca', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 70),
('banca.visualizza_movimenti', 'Movimenti Bancari', 'Vedere movimenti bancari', 'banca', TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, 71),
('banca.collega_conto', 'Collega Conto', 'Collegare nuovi conti bancari', 'banca', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 72),

-- Gestione Utenti (solo admin e titolare per i propri sotto-utenti)
('utenti.visualizza', 'Visualizza Utenti', 'Vedere lista utenti', 'gestione_utenti', TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, 80),
('utenti.crea', 'Crea Utenti', 'Creare nuovi utenti', 'gestione_utenti', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 81),
('utenti.modifica', 'Modifica Utenti', 'Modificare utenti', 'gestione_utenti', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 82),
('utenti.gestisci_permessi', 'Gestisci Permessi', 'Modificare permessi utenti', 'gestione_utenti', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, 83),

-- Gestione Centri
('centri.visualizza', 'Visualizza Centri', 'Vedere lista centri', 'gestione_centri', TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 90),
('centri.crea', 'Crea Centri', 'Creare nuovi centri', 'gestione_centri', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 91),
('centri.modifica', 'Modifica Centri', 'Modificare centri', 'gestione_centri', TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, 92),

-- Impostazioni
('impostazioni.profilo', 'Impostazioni Profilo', 'Modificare il proprio profilo', 'impostazioni', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 100),
('impostazioni.centro', 'Impostazioni Centro', 'Modificare impostazioni centro', 'impostazioni', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, 101),
('impostazioni.notifiche', 'Impostazioni Notifiche', 'Gestire le notifiche', 'impostazioni', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 102)

ON CONFLICT (codice) DO UPDATE SET
    nome = EXCLUDED.nome,
    descrizione = EXCLUDED.descrizione,
    default_admin = EXCLUDED.default_admin,
    default_hpa = EXCLUDED.default_hpa,
    default_titolare = EXCLUDED.default_titolare,
    default_direttore = EXCLUDED.default_direttore,
    default_amministrativo = EXCLUDED.default_amministrativo,
    modificabile_da_hpa = EXCLUDED.modificabile_da_hpa;

-- =====================================================
-- PARTE 8: FUNZIONI HELPER
-- =====================================================

-- Ottieni il livello gerarchico numerico
CREATE OR REPLACE FUNCTION get_role_level(p_ruolo user_role_level)
RETURNS INT AS $$
BEGIN
    RETURN CASE p_ruolo
        WHEN 'admin' THEN 0
        WHEN 'hpa' THEN 1
        WHEN 'titolare' THEN 2
        WHEN 'direttore' THEN 3
        WHEN 'amministrativo' THEN 3
        ELSE 99
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Verifica se un utente ha un permesso specifico
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_function_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role user_role_level;
    v_default_value BOOLEAN;
    v_override_value BOOLEAN;
    v_function_id UUID;
BEGIN
    -- Ottieni il ruolo dell'utente
    SELECT ruolo_livello INTO v_user_role
    FROM user_profiles
    WHERE id = p_user_id;

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Ottieni l'ID della funzione e il valore di default per il ruolo
    SELECT
        id,
        CASE v_user_role
            WHEN 'admin' THEN default_admin
            WHEN 'hpa' THEN default_hpa
            WHEN 'titolare' THEN default_titolare
            WHEN 'direttore' THEN default_direttore
            WHEN 'amministrativo' THEN default_amministrativo
            ELSE FALSE
        END
    INTO v_function_id, v_default_value
    FROM app_functions
    WHERE codice = p_function_code AND attivo = TRUE;

    IF v_function_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Controlla se c'è un override
    SELECT abilitato INTO v_override_value
    FROM user_permission_overrides
    WHERE user_id = p_user_id
    AND function_id = v_function_id
    AND (valido_fino IS NULL OR valido_fino >= CURRENT_DATE);

    -- Se c'è override, usa quello, altrimenti usa il default
    RETURN COALESCE(v_override_value, v_default_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ottieni tutti i permessi di un utente
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    function_code TEXT,
    function_name TEXT,
    categoria function_category,
    abilitato BOOLEAN,
    is_override BOOLEAN,
    override_by UUID
) AS $$
DECLARE
    v_user_role user_role_level;
BEGIN
    -- Ottieni il ruolo dell'utente
    SELECT ruolo_livello INTO v_user_role
    FROM user_profiles
    WHERE id = p_user_id;

    RETURN QUERY
    SELECT
        af.codice as function_code,
        af.nome as function_name,
        af.categoria,
        COALESCE(
            upo.abilitato,
            CASE v_user_role
                WHEN 'admin' THEN af.default_admin
                WHEN 'hpa' THEN af.default_hpa
                WHEN 'titolare' THEN af.default_titolare
                WHEN 'direttore' THEN af.default_direttore
                WHEN 'amministrativo' THEN af.default_amministrativo
                ELSE FALSE
            END
        ) as abilitato,
        (upo.id IS NOT NULL) as is_override,
        upo.impostato_da as override_by
    FROM app_functions af
    LEFT JOIN user_permission_overrides upo ON upo.function_id = af.id
        AND upo.user_id = p_user_id
        AND (upo.valido_fino IS NULL OR upo.valido_fino >= CURRENT_DATE)
    WHERE af.attivo = TRUE
    ORDER BY af.categoria, af.ordine;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ottieni gerarchia utenti sotto un titolare
CREATE OR REPLACE FUNCTION get_user_hierarchy(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    nome TEXT,
    cognome TEXT,
    ruolo_livello user_role_level,
    parent_user_id UUID,
    depth INT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE user_tree AS (
        -- Utente base
        SELECT
            up.id,
            up.email,
            up.nome,
            up.cognome,
            up.ruolo_livello,
            up.parent_user_id,
            0 as depth
        FROM user_profiles up
        WHERE up.id = p_user_id

        UNION ALL

        -- Sotto-utenti
        SELECT
            up.id,
            up.email,
            up.nome,
            up.cognome,
            up.ruolo_livello,
            up.parent_user_id,
            ut.depth + 1
        FROM user_profiles up
        JOIN user_tree ut ON up.parent_user_id = ut.id
        WHERE ut.depth < 5  -- Limite profondità
    )
    SELECT * FROM user_tree
    ORDER BY depth, cognome, nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ottieni centri accessibili per un utente (con tipo accesso)
CREATE OR REPLACE FUNCTION get_user_centri_access(p_user_id UUID)
RETURNS TABLE (
    centro_id UUID,
    centro_nome TEXT,
    tipo_accesso TEXT,
    is_sede_principale BOOLEAN,
    permessi_centro JSONB
) AS $$
DECLARE
    v_user_role user_role_level;
BEGIN
    SELECT ruolo_livello INTO v_user_role FROM user_profiles WHERE id = p_user_id;

    -- Admin vede tutto
    IF v_user_role = 'admin' THEN
        RETURN QUERY
        SELECT
            bc.id,
            bc.nome,
            'admin'::TEXT,
            TRUE,
            '{}'::JSONB
        FROM beauty_centers bc
        ORDER BY bc.nome;
        RETURN;
    END IF;

    -- Altri ruoli: usa la tabella user_centro_access
    RETURN QUERY
    SELECT
        bc.id,
        bc.nome,
        uca.tipo_accesso,
        uca.is_sede_principale,
        uca.permessi_centro
    FROM user_centro_access uca
    JOIN beauty_centers bc ON bc.id = uca.centro_id
    WHERE uca.user_id = p_user_id
    AND uca.attivo = TRUE
    AND (uca.data_fine IS NULL OR uca.data_fine >= CURRENT_DATE)
    ORDER BY uca.is_sede_principale DESC, bc.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Imposta un permesso (con controllo autorizzazione)
CREATE OR REPLACE FUNCTION set_user_permission(
    p_target_user_id UUID,
    p_function_code TEXT,
    p_abilitato BOOLEAN,
    p_motivo TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role user_role_level;
    v_target_role user_role_level;
    v_function_id UUID;
    v_modificabile_da_hpa BOOLEAN;
BEGIN
    v_caller_id := auth.uid();

    -- Ottieni ruoli
    SELECT ruolo_livello INTO v_caller_role FROM user_profiles WHERE id = v_caller_id;
    SELECT ruolo_livello INTO v_target_role FROM user_profiles WHERE id = p_target_user_id;

    -- Ottieni info funzione
    SELECT id, modificabile_da_hpa INTO v_function_id, v_modificabile_da_hpa
    FROM app_functions WHERE codice = p_function_code;

    IF v_function_id IS NULL THEN
        RAISE EXCEPTION 'Funzione non trovata: %', p_function_code;
    END IF;

    -- Verifica autorizzazione
    IF v_caller_role = 'admin' THEN
        -- Admin può tutto
        NULL;
    ELSIF v_caller_role = 'hpa' THEN
        -- HPA può modificare solo se la funzione lo permette
        IF NOT v_modificabile_da_hpa THEN
            RAISE EXCEPTION 'HPA non autorizzato a modificare questa funzione';
        END IF;
        -- E solo per utenti assegnati
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = p_target_user_id AND hpa_assegnato_id = v_caller_id
        ) THEN
            RAISE EXCEPTION 'Utente non assegnato a questo HPA';
        END IF;
    ELSIF v_caller_role = 'titolare' THEN
        -- Titolare può modificare solo i propri sotto-utenti
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = p_target_user_id AND parent_user_id = v_caller_id
        ) THEN
            RAISE EXCEPTION 'Non autorizzato a modificare questo utente';
        END IF;
    ELSE
        RAISE EXCEPTION 'Non autorizzato';
    END IF;

    -- Inserisci o aggiorna override
    INSERT INTO user_permission_overrides (user_id, function_id, abilitato, impostato_da, impostato_da_ruolo, motivo)
    VALUES (p_target_user_id, v_function_id, p_abilitato, v_caller_id, v_caller_role, p_motivo)
    ON CONFLICT (user_id, function_id) DO UPDATE SET
        abilitato = p_abilitato,
        impostato_da = v_caller_id,
        impostato_da_ruolo = v_caller_role,
        motivo = p_motivo,
        updated_at = NOW();

    -- Log audit
    INSERT INTO permission_audit_log (user_id, function_id, azione, valore_nuovo, eseguito_da, eseguito_da_ruolo, note)
    VALUES (p_target_user_id, v_function_id, CASE WHEN p_abilitato THEN 'grant' ELSE 'revoke' END, p_abilitato, v_caller_id, v_caller_role, p_motivo);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 9: MIGRAZIONE DATI ESISTENTI
-- =====================================================

-- Aggiorna ruolo_livello basandosi sul vecchio campo ruolo
UPDATE user_profiles SET ruolo_livello =
    CASE ruolo
        WHEN 'admin' THEN 'admin'::user_role_level
        WHEN 'hpa' THEN 'hpa'::user_role_level
        WHEN 'centro' THEN 'titolare'::user_role_level
        ELSE 'titolare'::user_role_level
    END
WHERE ruolo_livello IS NULL OR ruolo_livello = 'titolare';

-- Migra associazioni centro esistenti a user_centro_access
INSERT INTO user_centro_access (user_id, centro_id, tipo_accesso, is_sede_principale, attivo)
SELECT
    up.id,
    up.centro_id,
    'titolare',
    TRUE,
    TRUE
FROM user_profiles up
WHERE up.centro_id IS NOT NULL
AND up.ruolo_livello = 'titolare'
ON CONFLICT (user_id, centro_id, tipo_accesso) DO NOTHING;

-- Migra assegnazioni HPA esistenti
INSERT INTO user_centro_access (user_id, centro_id, tipo_accesso, attivo, data_inizio, data_fine)
SELECT
    hca.hpa_id,
    hca.centro_id,
    'hpa',
    TRUE,
    hca.data_inizio,
    hca.data_fine
FROM hpa_centro_assignments hca
ON CONFLICT (user_id, centro_id, tipo_accesso) DO NOTHING;

-- Imposta hpa_assegnato_id per utenti con HPA
UPDATE user_profiles up SET hpa_assegnato_id = (
    SELECT DISTINCT hca.hpa_id
    FROM hpa_centro_assignments hca
    WHERE hca.centro_id = up.centro_id
    AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
    LIMIT 1
)
WHERE up.centro_id IS NOT NULL AND up.hpa_assegnato_id IS NULL;

-- =====================================================
-- PARTE 10: RLS POLICIES
-- =====================================================

-- App Functions (tutti possono leggere)
ALTER TABLE app_functions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutti possono leggere funzioni" ON app_functions;
CREATE POLICY "Tutti possono leggere funzioni" ON app_functions
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Solo admin modifica funzioni" ON app_functions;
CREATE POLICY "Solo admin modifica funzioni" ON app_functions
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
);

-- User Permission Overrides
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono propri permessi" ON user_permission_overrides;
CREATE POLICY "Utenti vedono propri permessi" ON user_permission_overrides
FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'hpa'
               AND id = (SELECT hpa_assegnato_id FROM user_profiles WHERE id = user_permission_overrides.user_id))
);

-- User Centro Access
ALTER TABLE user_centro_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono propri accessi" ON user_centro_access;
CREATE POLICY "Utenti vedono propri accessi" ON user_centro_access
FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
);

DROP POLICY IF EXISTS "Admin e titolari gestiscono accessi" ON user_centro_access;
CREATE POLICY "Admin e titolari gestiscono accessi" ON user_centro_access
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello IN ('admin', 'titolare'))
);

-- =====================================================
-- PARTE 11: VERIFICA
-- =====================================================

SELECT '=== MIGRAZIONE PERMESSI COMPLETATA ===' as info;

SELECT 'Funzioni app create:' as info, COUNT(*) as count FROM app_functions;
SELECT 'Utenti migrati con ruolo_livello:' as info, ruolo_livello, COUNT(*) as count
FROM user_profiles GROUP BY ruolo_livello;
SELECT 'Accessi centro migrati:' as info, COUNT(*) as count FROM user_centro_access;
