-- =====================================================
-- STEP 6: Aggiorna il trigger handle_new_user
-- per essere compatibile con le nuove colonne
-- =====================================================

-- Ricrea la funzione trigger con gestione errori
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        email,
        ruolo,
        ruolo_livello,
        piano,
        attivo
    )
    VALUES (
        NEW.id,
        NEW.email,
        'centro',
        'titolare',
        'demo',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log dell'errore ma non blocca la creazione utente
        RAISE WARNING 'Errore creazione profilo per %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica che tutte le colonne aggiunte accettino NULL
-- (nessuna dovrebbe essere NOT NULL senza default)

-- Verifica
SELECT 'Trigger handle_new_user aggiornato!' as status;
