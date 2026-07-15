-- ============================================================
-- ESEGUI_centro_listino_01_tables.sql
-- Tabelle per: Listino Prezzi, IVA, Costi Esercizio, Pacchetti
-- Eseguire nel SQL Editor di Supabase Dashboard
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. IVA ALIQUOTE (3 tipologie fiscali per centro)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iva_aliquote (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id     UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,           -- "Ordinaria", "Ridotta", "Esente"
  percentuale   DECIMAL(5,2) NOT NULL DEFAULT 22,
  predefinita   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE iva_aliquote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iva_aliquote_select" ON iva_aliquote FOR SELECT
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "iva_aliquote_insert" ON iva_aliquote FOR INSERT
  WITH CHECK (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "iva_aliquote_update" ON iva_aliquote FOR UPDATE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "iva_aliquote_delete" ON iva_aliquote FOR DELETE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 2. COSTI DI ESERCIZIO (costo/ora operativo per centro)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS costi_esercizio (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id                UUID NOT NULL UNIQUE REFERENCES beauty_centers(id) ON DELETE CASCADE,
  costo_ora_manuale        DECIMAL(10,2),          -- valore inserito dall'utente (€/ora)
  usa_calcolo_automatico   BOOLEAN NOT NULL DEFAULT true,  -- usa media da movimenti
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE costi_esercizio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costi_esercizio_select" ON costi_esercizio FOR SELECT
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "costi_esercizio_insert" ON costi_esercizio FOR INSERT
  WITH CHECK (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "costi_esercizio_update" ON costi_esercizio FOR UPDATE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 3. SERVIZI (catalogo trattamenti del centro)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servizi (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id                UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome                     TEXT NOT NULL,
  descrizione              TEXT,
  categoria                TEXT,

  -- Scomposizione temporale del servizio (in minuti)
  -- Esempio pressoterapia 45 min totali:
  --   preparazione=10 (operatrice presente), esecuzione=20 (cliente sola),
  --   chiusura=10 (operatrice presente), sanificazione=5 (costo pieno)
  durata_preparazione_min  INTEGER NOT NULL DEFAULT 0,   -- operatrice DEVE essere presente
  durata_esecuzione_min    INTEGER NOT NULL DEFAULT 0,   -- cliente autonoma, operatrice libera
  durata_chiusura_min      INTEGER NOT NULL DEFAULT 0,   -- operatrice DEVE essere presente
  durata_sanificazione_min INTEGER NOT NULL DEFAULT 5,   -- pulizia cabina, costo pieno

  nr_operatrici            INTEGER NOT NULL DEFAULT 1,
  sovrapponibile           BOOLEAN NOT NULL DEFAULT false, -- può fare altro durante esecuzione

  -- Pricing
  iva_aliquota_id          UUID REFERENCES iva_aliquote(id) ON DELETE SET NULL,
  ricarico_percentuale     DECIMAL(5,2) NOT NULL DEFAULT 30,

  -- Cache indagine di mercato (TTL suggerito: 30 giorni)
  mercato_prezzo_min       DECIMAL(10,2),
  mercato_prezzo_max       DECIMAL(10,2),
  mercato_prezzo_medio     DECIMAL(10,2),
  mercato_ultima_ricerca   TIMESTAMPTZ,
  mercato_note             TEXT,

  attivo                   BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE servizi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servizi_select" ON servizi FOR SELECT
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "servizi_insert" ON servizi FOR INSERT
  WITH CHECK (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "servizi_update" ON servizi FOR UPDATE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "servizi_delete" ON servizi FOR DELETE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));

-- Service role bypass
CREATE POLICY "servizi_service_role" ON servizi FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 4. SERVIZI_MATERIALI (costi variabili per servizio)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servizi_materiali (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servizio_id     UUID NOT NULL REFERENCES servizi(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  costo_unitario  DECIMAL(10,4) NOT NULL DEFAULT 0,
  quantita_uso    DECIMAL(10,4) NOT NULL DEFAULT 1,
  unita           TEXT NOT NULL DEFAULT 'pz'  -- pz, ml, g, l, etc.
);

ALTER TABLE servizi_materiali ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servizi_materiali_select" ON servizi_materiali FOR SELECT
  USING (servizio_id IN (
    SELECT id FROM servizi WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));
CREATE POLICY "servizi_materiali_insert" ON servizi_materiali FOR INSERT
  WITH CHECK (servizio_id IN (
    SELECT id FROM servizi WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));
CREATE POLICY "servizi_materiali_update" ON servizi_materiali FOR UPDATE
  USING (servizio_id IN (
    SELECT id FROM servizi WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));
CREATE POLICY "servizi_materiali_delete" ON servizi_materiali FOR DELETE
  USING (servizio_id IN (
    SELECT id FROM servizi WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "servizi_materiali_service_role" ON servizi_materiali FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 5. PACCHETTI (bundle di servizi con sconto)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacchetti (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id            UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  nome                 TEXT NOT NULL,
  descrizione          TEXT,
  sconto_percentuale   DECIMAL(5,2) NOT NULL DEFAULT 0,
  attivo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pacchetti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacchetti_select" ON pacchetti FOR SELECT
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "pacchetti_insert" ON pacchetti FOR INSERT
  WITH CHECK (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "pacchetti_update" ON pacchetti FOR UPDATE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "pacchetti_delete" ON pacchetti FOR DELETE
  USING (centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 6. PACCHETTI_ITEMS (servizi inclusi in ogni pacchetto)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacchetti_items (
  pacchetto_id   UUID NOT NULL REFERENCES pacchetti(id) ON DELETE CASCADE,
  servizio_id    UUID NOT NULL REFERENCES servizi(id) ON DELETE CASCADE,
  quantita       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (pacchetto_id, servizio_id)
);

ALTER TABLE pacchetti_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacchetti_items_select" ON pacchetti_items FOR SELECT
  USING (pacchetto_id IN (
    SELECT id FROM pacchetti WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));
CREATE POLICY "pacchetti_items_insert" ON pacchetti_items FOR INSERT
  WITH CHECK (pacchetto_id IN (
    SELECT id FROM pacchetti WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));
CREATE POLICY "pacchetti_items_delete" ON pacchetti_items FOR DELETE
  USING (pacchetto_id IN (
    SELECT id FROM pacchetti WHERE centro_id IN (
      SELECT centro_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- ────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_iva_aliquote_centro ON iva_aliquote(centro_id);
CREATE INDEX IF NOT EXISTS idx_costi_esercizio_centro ON costi_esercizio(centro_id);
CREATE INDEX IF NOT EXISTS idx_servizi_centro ON servizi(centro_id);
CREATE INDEX IF NOT EXISTS idx_servizi_materiali_servizio ON servizi_materiali(servizio_id);
CREATE INDEX IF NOT EXISTS idx_pacchetti_centro ON pacchetti(centro_id);
CREATE INDEX IF NOT EXISTS idx_pacchetti_items_pacchetto ON pacchetti_items(pacchetto_id);
