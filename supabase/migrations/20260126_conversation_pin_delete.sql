-- Migrazione: Aggiunge funzionalità pin/delete per conversazioni
-- Data: 2026-01-26
-- Descrizione: Permette agli HPA di pinnare conversazioni (impedendo eliminazione da parte utente)
--              e agli utenti di eliminare conversazioni non pinnate

-- Aggiungi colonne per gestione pin
ALTER TABLE beautyx_conversations
ADD COLUMN IF NOT EXISTS pinned_by_hpa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID,
ADD COLUMN IF NOT EXISTS pinned_reason TEXT;

-- Aggiungi colonna per soft-delete
ALTER TABLE beautyx_conversations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Indice per query veloci su conversazioni non eliminate
CREATE INDEX IF NOT EXISTS idx_beautyx_conversations_not_deleted
ON beautyx_conversations (centro_id, deleted_at)
WHERE deleted_at IS NULL;

-- Indice per conversazioni pinnate
CREATE INDEX IF NOT EXISTS idx_beautyx_conversations_pinned
ON beautyx_conversations (centro_id, pinned_by_hpa)
WHERE pinned_by_hpa = TRUE;

-- Commenti per documentazione
COMMENT ON COLUMN beautyx_conversations.pinned_by_hpa IS 'Se TRUE, la conversazione è stata pinnata da un HPA e non può essere eliminata dall''utente';
COMMENT ON COLUMN beautyx_conversations.pinned_at IS 'Timestamp di quando la conversazione è stata pinnata';
COMMENT ON COLUMN beautyx_conversations.pinned_by IS 'UUID dell''HPA che ha pinnato la conversazione';
COMMENT ON COLUMN beautyx_conversations.pinned_reason IS 'Motivo opzionale per cui l''HPA ha pinnato la conversazione';
COMMENT ON COLUMN beautyx_conversations.deleted_at IS 'Timestamp di eliminazione (soft-delete). Se NULL, la conversazione è visibile';
COMMENT ON COLUMN beautyx_conversations.deleted_by IS 'UUID dell''utente che ha eliminato la conversazione';
