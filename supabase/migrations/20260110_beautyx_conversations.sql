-- Sistema di conversazioni Beautyx con memoria storica
-- Permette a Beautyx di mantenere context e tracciare progressi nel tempo

-- Tabella conversazioni: sessioni di dialogo con Beautyx
CREATE TABLE IF NOT EXISTS beautyx_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  titolo TEXT DEFAULT 'Nuova conversazione',
  ultimo_contesto JSONB DEFAULT '{}', -- Ultimo stato conosciuto (KPI, obiettivi, alert)
  data_inizio TIMESTAMP DEFAULT now(),
  data_ultimo_messaggio TIMESTAMP DEFAULT now(),
  messaggi_count INTEGER DEFAULT 0,
  attiva BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabella messaggi: ogni singola interazione
CREATE TABLE IF NOT EXISTS beautyx_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES beautyx_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'beautyx')),
  contenuto TEXT NOT NULL,
  page_context VARCHAR(50), -- pagina da cui è stato inviato (dashboard, movimenti, analytics, ecc)
  metadata JSONB DEFAULT '{}', -- dati aggiuntivi (KPI del momento, filtri attivi, ecc)
  timestamp TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

-- Tabella insights: obiettivi, progressi, suggerimenti identificati da Beautyx
CREATE TABLE IF NOT EXISTS beautyx_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES beautyx_conversations(id) ON DELETE SET NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('obiettivo', 'progresso', 'alert', 'suggerimento', 'traguardo')),
  titolo TEXT NOT NULL,
  descrizione TEXT,
  valore_iniziale DECIMAL(10,2),
  valore_target DECIMAL(10,2),
  valore_corrente DECIMAL(10,2),
  data_inizio DATE,
  data_target DATE,
  stato VARCHAR(20) DEFAULT 'attivo' CHECK (stato IN ('attivo', 'completato', 'abbandonato', 'in_ritardo')),
  priorita INTEGER DEFAULT 3 CHECK (priorita BETWEEN 1 AND 5), -- 1=critica, 5=bassa
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_beautyx_conv_centro ON beautyx_conversations(centro_id);
CREATE INDEX idx_beautyx_conv_attiva ON beautyx_conversations(centro_id, attiva);
CREATE INDEX idx_beautyx_msg_conversation ON beautyx_messages(conversation_id);
CREATE INDEX idx_beautyx_msg_timestamp ON beautyx_messages(timestamp DESC);
CREATE INDEX idx_beautyx_insights_centro ON beautyx_insights(centro_id);
CREATE INDEX idx_beautyx_insights_stato ON beautyx_insights(centro_id, stato);
CREATE INDEX idx_beautyx_insights_tipo ON beautyx_insights(tipo);

-- Trigger per aggiornare timestamp
CREATE OR REPLACE FUNCTION update_beautyx_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beautyx_conversations_updated_at
BEFORE UPDATE ON beautyx_conversations
FOR EACH ROW
EXECUTE FUNCTION update_beautyx_conversations_updated_at();

CREATE OR REPLACE FUNCTION update_beautyx_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beautyx_insights_updated_at
BEFORE UPDATE ON beautyx_insights
FOR EACH ROW
EXECUTE FUNCTION update_beautyx_insights_updated_at();

-- Trigger per aggiornare data_ultimo_messaggio e count
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE beautyx_conversations
  SET
    data_ultimo_messaggio = NEW.timestamp,
    messaggi_count = messaggi_count + 1,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beautyx_message_update_conversation
AFTER INSERT ON beautyx_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- Commenti documentazione
COMMENT ON TABLE beautyx_conversations IS 'Sessioni di conversazione con Beautyx AI - mantiene memoria e contesto';
COMMENT ON TABLE beautyx_messages IS 'Storico messaggi di ogni conversazione';
COMMENT ON TABLE beautyx_insights IS 'Obiettivi, progressi e insights identificati da Beautyx durante le conversazioni';
COMMENT ON COLUMN beautyx_conversations.ultimo_contesto IS 'Snapshot ultimo stato noto: KPI, obiettivi attivi, alert pendenti';
COMMENT ON COLUMN beautyx_messages.metadata IS 'Dati contestuali al momento del messaggio: pagina, filtri, KPI visibili';
COMMENT ON COLUMN beautyx_insights.tipo IS 'Tipo insight: obiettivo=target da raggiungere, progresso=avanzamento, alert=attenzione, suggerimento=consiglio, traguardo=obiettivo raggiunto';
