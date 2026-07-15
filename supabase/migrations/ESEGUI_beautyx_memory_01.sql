-- ============================================================
-- BeautyX Memory Persistente
-- Memorizza fatti chiave appresi da BeautyX su ogni centro
-- ============================================================

CREATE TABLE IF NOT EXISTS beautyx_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id   UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  contenuto   TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_id)
);

-- RLS
ALTER TABLE beautyx_memory ENABLE ROW LEVEL SECURITY;

-- Lettura: staff del centro
CREATE POLICY "beautyx_memory_read" ON beautyx_memory
  FOR SELECT USING (
    centro_id IN (
      SELECT centro_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Scrittura: solo API con service key (bypass RLS), quindi nessuna policy INSERT/UPDATE per utenti
-- Le API route usano service key, non il client utente

-- Index
CREATE INDEX IF NOT EXISTS idx_beautyx_memory_centro ON beautyx_memory(centro_id);
