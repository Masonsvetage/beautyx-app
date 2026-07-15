-- =====================================================
-- Aggiunge tipo contatto e URL stanza agli appuntamenti HPA
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Tipo di contatto sull'appuntamento
ALTER TABLE hpa_appointments
  ADD COLUMN IF NOT EXISTS tipo_contatto TEXT DEFAULT 'chat'
    CHECK (tipo_contatto IN ('chat', 'audio', 'video'));

-- 2. URL stanza Jitsi (pre-generata alla prenotazione per audio/video)
ALTER TABLE hpa_appointments
  ADD COLUMN IF NOT EXISTS room_url TEXT;

-- 3. Nota cliente alla prenotazione (per distinguere da note HPA)
ALTER TABLE hpa_appointments
  ADD COLUMN IF NOT EXISTS note_cliente TEXT;

-- Verifica
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'hpa_appointments'
  AND column_name IN ('tipo_contatto', 'room_url', 'note_cliente')
ORDER BY column_name;
