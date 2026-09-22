-- =====================================================
-- FIX CRITICO (21/09/2026, task #218) — trigger handle_new_user() non
-- includeva mai nome/cognome, NOT NULL senza default su user_profiles.
-- Applicata DIRETTAMENTE in produzione il 21/09/2026 (Davide, via
-- apply_migration MCP, nome "fix_handle_new_user_nome_cognome_not_null_20260921",
-- standing authorization già in vigore per le migration DB — vedi
-- memory/generale.md, voce "Autorizzazione tracciata"). Questo file è il
-- record nel repo di quanto già eseguito live — NON va ri-eseguito a mano,
-- è idempotente (CREATE OR REPLACE) ma è già applicato.
-- =====================================================
--
-- CAUSA REALE (confermata sui dati veri di produzione, non un'ipotesi):
-- il trigger `on_auth_user_created` (creato il 07/09/2026, vedi
-- 20260907_fix_user_profiles_schema_drift.sql) chiama handle_new_user(), che
-- faceva:
--   INSERT INTO public.user_profiles (id, email, ruolo, ruolo_livello, piano, attivo)
--   VALUES (NEW.id, NEW.email, 'centro', 'titolare', 'demo', TRUE)
-- SENZA includere le colonne nome/cognome — NOT NULL senza default su
-- user_profiles. L'INSERT falliva quindi SEMPRE con una violazione di
-- vincolo, catturata in silenzio dal blocco EXCEPTION WHEN OTHERS (solo un
-- RAISE WARNING nei log Postgres, mai visibile all'app né all'utente): da
-- quando il trigger esiste, NESSUNA riga user_profiles è mai stata creata
-- per un signup nuovo tramite trigger.
--
-- Sintomo lato utente: dopo la conferma email, la pagina di completamento
-- centro (/impostazioni?primo-accesso=1) e app/api/onboarding/create-centro/route.js
-- non trovavano alcun profilo per l'utente (pur essendo l'account autenticato
-- e attivo — provabile aprendo qualunque altra pagina protetta) — "nessun
-- utente trovato", bug bloccante segnalato da Mason nel primo collaudo dal
-- vivo reale su produzione (21/09/2026).
--
-- Verificato sui dati reali: auth.users per admin@svetage.com (test di Mason
-- di oggi) aveva già raw_user_meta_data = {"nome":"Luigi","cognome":"Perri",...}
-- (AuthContext.js signUp() lo passa correttamente in options.data), eppure
-- public.user_profiles non aveva nessuna riga per quell'id.
--
-- Fix: il trigger ora legge nome/cognome da raw_user_meta_data (con
-- fallback 'Nuovo'/'Utente' se assenti, per non violare mai il NOT NULL).
-- Questo fix da solo NON basta a coprire tutta l'anagrafica raccolta nel
-- form di /signup (residenza, documento, ecc.) — quella viene ora
-- sincronizzata in modo auto-risanante da app/auth/callback/route.js
-- (funzione syncProfileFromAuthMetadata), nel primo momento in cui esiste
-- una sessione autenticata reale, indipendentemente dall'affidabilità di
-- questo trigger. Vedi anche contexts/AuthContext.js (signUp() ora passa
-- l'intera anagrafica in options.data, non solo nome/cognome).
--
-- Riparazione dati eseguita in produzione nello stesso giro (non in questo
-- file, eseguita via execute_sql, riportata qui solo per tracciabilità):
-- backfill di public.user_profiles per l'account di test rotto di oggi
-- (admin@svetage.com, id a25a01f1-b839-4e83-bf77-bd86775b4a6f), collegato
-- al centro "Svetagino" (e65b8314-2eef-40eb-b07c-50ccbded40b2) creato orfano
-- dallo stesso test, più assegnazione del piano report_profiling che
-- create-centro avrebbe fatto se il profilo non fosse mancato.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, nome, cognome, ruolo, ruolo_livello, piano, attivo)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''), 'Nuovo'),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'cognome'), ''), 'Utente'),
        'centro',
        'titolare',
        'demo',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log dell'errore ma non blocca la creazione dell'utente auth: meglio un
    -- utente auth.users senza profilo (recuperabile) che un signup rotto del
    -- tutto. Il self-healing vero pero' ora vive in app/auth/callback/route.js
    -- (upsert completo da user_metadata al primo momento in cui esiste una
    -- sessione reale), che non dipende dall'affidabilita' di questo trigger.
    RAISE WARNING 'Errore creazione profilo per %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
