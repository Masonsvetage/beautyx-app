-- ===================================================================
-- Aggiungi campo per avatar Beautyx personalizzabile
-- ===================================================================

-- Aggiungi colonna avatar URL alla tabella beauty_centers
ALTER TABLE beauty_centers
ADD COLUMN IF NOT EXISTS beautyx_avatar_url TEXT;

-- Commento documentazione
COMMENT ON COLUMN beauty_centers.beautyx_avatar_url IS
  'URL immagine avatar personalizzato Beautyx (modificabile solo da admin)';

-- Set default per centri esistenti (usa l'SVG di default)
UPDATE beauty_centers
SET beautyx_avatar_url = '/beautyx-avatar.svg'
WHERE beautyx_avatar_url IS NULL;

-- ===================================================================
-- ✅ COMPLETATO!
-- ===================================================================
-- Ora ogni centro può avere un avatar Beautyx personalizzato
-- Modificabile solo tramite interfaccia admin
-- ===================================================================
