-- =====================================================
-- Integrazione email per Beautyx AI
-- Eseguire in Supabase Dashboard > SQL Editor
-- =====================================================

-- Configurazioni email collegate ai centri
CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  centro_id UUID REFERENCES beauty_centers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Email',             -- nome amichevole
  email_address TEXT NOT NULL,
  -- IMAP (ricezione)
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_user TEXT NOT NULL,
  imap_password TEXT NOT NULL,                     -- cifrato lato server
  imap_secure BOOLEAN NOT NULL DEFAULT true,
  -- SMTP (invio)
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,                     -- cifrato lato server
  smtp_secure BOOLEAN NOT NULL DEFAULT false,
  -- Stato
  active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email ricevute e classificate da Beautyx AI
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES email_integrations(id) ON DELETE CASCADE,
  message_uid TEXT NOT NULL,                        -- IMAP UID per deduplicazione
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  body_preview TEXT,                                -- primi 800 chars del testo
  received_at TIMESTAMPTZ,
  -- Classificazione AI
  category TEXT CHECK (category IN ('gestionale', 'engagement', 'spam', 'altro')),
  subcategory TEXT,
  sentiment TEXT CHECK (sentiment IN ('positivo', 'neutro', 'negativo')),
  ai_summary TEXT,
  ai_amounts JSONB DEFAULT '[]',
  important BOOLEAN DEFAULT false,
  -- Stato lettura
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (integration_id, message_uid)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_email_messages_integration ON email_messages(integration_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_category ON email_messages(category);
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_integrations_user ON email_integrations(user_id);

-- RLS
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti gestiscono proprie integrazioni" ON email_integrations;
CREATE POLICY "Utenti gestiscono proprie integrazioni" ON email_integrations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti leggono proprie email" ON email_messages;
CREATE POLICY "Utenti leggono proprie email" ON email_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM email_integrations
      WHERE id = email_messages.integration_id
      AND user_id = auth.uid()
    )
  );

SELECT 'Tabelle email_integrations e email_messages create!' AS status;
