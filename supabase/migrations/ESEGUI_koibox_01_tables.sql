-- Tabelle Koibox: clienti, servizi, casse, appuntamenti
-- Ogni tabella ha centro_id per isolare i dati per centro estetico
-- Eseguire in quest'ordine nel SQL Editor di Supabase

-- Elimina tabelle precedenti se esistono (ricreazione pulita)
DROP TABLE IF EXISTS koibox_appuntamenti CASCADE;
DROP TABLE IF EXISTS koibox_casse CASCADE;
DROP TABLE IF EXISTS koibox_servizi CASCADE;
DROP TABLE IF EXISTS koibox_clienti CASCADE;

-- ─── CLIENTI ───────────────────────────────────────────────────────────────
CREATE TABLE koibox_clienti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id        UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  koibox_id        INTEGER,
  nome             TEXT,
  cognome          TEXT,
  sesso            TEXT,
  data_nascita     DATE,
  telefono         TEXT,
  email            TEXT,
  citta            TEXT,
  data_alta        DATE,
  attivo           BOOLEAN DEFAULT true,
  fatturato_totale NUMERIC(10,2) DEFAULT 0,
  ultima_vendita   TIMESTAMPTZ,
  punti            INTEGER DEFAULT 0,
  note             TEXT,
  imported_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_koibox_clienti_centro ON koibox_clienti(centro_id);
CREATE INDEX idx_koibox_clienti_ultima_vendita ON koibox_clienti(centro_id, ultima_vendita);
ALTER TABLE koibox_clienti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "koibox_clienti_admin" ON koibox_clienti USING (false); -- solo service key

-- ─── SERVIZI ───────────────────────────────────────────────────────────────
CREATE TABLE koibox_servizi (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id        UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  referenza        TEXT,
  nome             TEXT NOT NULL,
  prezzo           NUMERIC(8,2),
  durata_minuti    INTEGER,
  categoria        TEXT,
  mostra_online    BOOLEAN DEFAULT false,
  attivo           BOOLEAN DEFAULT true,
  imported_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_koibox_servizi_centro ON koibox_servizi(centro_id);
ALTER TABLE koibox_servizi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "koibox_servizi_admin" ON koibox_servizi USING (false);

-- ─── CASSE ─────────────────────────────────────────────────────────────────
CREATE TABLE koibox_casse (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id        UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  data             DATE NOT NULL,
  incasso_contanti NUMERIC(10,2) DEFAULT 0,
  incasso_carta    NUMERIC(10,2) DEFAULT 0,
  incasso_online   NUMERIC(10,2) DEFAULT 0,
  incasso_bonifico NUMERIC(10,2) DEFAULT 0,
  totale_giorno    NUMERIC(10,2) DEFAULT 0,
  n_scontrini      INTEGER,
  imported_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (centro_id, data)
);
CREATE INDEX idx_koibox_casse_centro_data ON koibox_casse(centro_id, data);
ALTER TABLE koibox_casse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "koibox_casse_admin" ON koibox_casse USING (false);

-- ─── APPUNTAMENTI ──────────────────────────────────────────────────────────
CREATE TABLE koibox_appuntamenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id        UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  koibox_id        INTEGER,
  cliente_nome     TEXT,
  cliente_tel      TEXT,
  dipendente       TEXT,
  data_ora         TIMESTAMPTZ,
  titolo           TEXT,
  status           TEXT,
  servizi          TEXT,
  imported_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_koibox_appt_centro_data ON koibox_appuntamenti(centro_id, data_ora);
ALTER TABLE koibox_appuntamenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "koibox_appt_admin" ON koibox_appuntamenti USING (false);
