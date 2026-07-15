-- =====================================================
-- RIMOZIONE SISTEMA DOCUMENTO IDENTITA
-- Rimuove funzioni di blocco/verifica documento
-- Sblocca profili bloccati per documento scaduto
-- Le colonne documento restano per sicurezza dati
-- =====================================================

-- Rimuovi funzione che blocca automaticamente profili con documento scaduto
DROP FUNCTION IF EXISTS check_and_block_expired_documents();

-- Rimuovi funzione che verifica stato documento
DROP FUNCTION IF EXISTS get_documento_status(UUID);

-- Sblocca tutti i profili bloccati per documento scaduto
UPDATE user_profiles
SET profilo_bloccato = false,
    profilo_bloccato_motivo = NULL,
    profilo_bloccato_data = NULL
WHERE profilo_bloccato = true
  AND profilo_bloccato_motivo = 'documento_scaduto';

-- Nota: le colonne documento_tipo, documento_numero, ecc. restano nella tabella
-- per preservare i dati esistenti. Non vengono piu utilizzate dall'app.

SELECT 'Migrazione completata: sistema documento rimosso' as info;
