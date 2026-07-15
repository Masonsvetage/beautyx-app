-- Aggiunge TUTTE le colonne mancanti alle tabelle Koibox
-- Basato sull'analisi diretta dei file Excel Koibox reali
-- Eseguire nel SQL Editor di Supabase (dopo _01, _02, _03)
-- Usa ADD COLUMN IF NOT EXISTS → sicuro da eseguire più volte

-- ─── CASSE: apertura cassa (fondo) ──────────────────────────────────────────
-- r[1] = "Apertura di cassa: <nome azienda>" — importo fondo cassa giornaliero
ALTER TABLE koibox_casse
  ADD COLUMN IF NOT EXISTS apertura_cassa NUMERIC(10,2) DEFAULT 0;

-- ─── CLIENTI: colonne mancanti ───────────────────────────────────────────────
-- r[2]  = Segundo apellido (secondo cognome)
-- r[6]  = Teléfono fijo — telefono fisso
-- r[8]  = Documento de identidad — codice fiscale/doc identità
-- r[9]  = Dirección — indirizzo
-- r[11] = Código postal — CAP
-- r[14] = Información clínica — note cliniche
-- r[16] = ¿Cómo nos conoció? — come ha conosciuto il centro
-- r[19] = Suscrito al newsletter — iscritto newsletter
-- r[20] = Envíos email — numero email inviate
-- r[21] = RGPD — consenso privacy GDPR
-- r[22] = Importe deudas — importo debiti cliente
ALTER TABLE koibox_clienti
  ADD COLUMN IF NOT EXISTS secondo_cognome   TEXT,
  ADD COLUMN IF NOT EXISTS telefono_fisso    TEXT,
  ADD COLUMN IF NOT EXISTS documento_identita TEXT,
  ADD COLUMN IF NOT EXISTS indirizzo         TEXT,
  ADD COLUMN IF NOT EXISTS cap               TEXT,
  ADD COLUMN IF NOT EXISTS info_clinica      TEXT,
  ADD COLUMN IF NOT EXISTS come_conosciuto   TEXT,
  ADD COLUMN IF NOT EXISTS newsletter        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_inviati     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rgpd              BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS importo_debiti    NUMERIC(10,2) DEFAULT 0;

-- ─── SERVIZI: colonne mancanti ───────────────────────────────────────────────
-- r[6]  = Dettagli — descrizione servizio
-- r[7]  = Sconto online — sconto applicato online
-- r[8]  = Dipendenti (email separate da ,) — dipendenti abilitati al servizio
-- r[9]  = Imposte — codice IVA (es. "22")
-- r[11] = Prezzo tariffa 1
-- r[12] = Prezzo tariffa 2
-- r[13] = Prezzo tariffa 3
-- r[14] = Prezzo tariffa 4
ALTER TABLE koibox_servizi
  ADD COLUMN IF NOT EXISTS dettagli          TEXT,
  ADD COLUMN IF NOT EXISTS sconto_online     NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dipendenti        TEXT,
  ADD COLUMN IF NOT EXISTS imposte           TEXT,
  ADD COLUMN IF NOT EXISTS prezzo_tariffa_1  NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS prezzo_tariffa_2  NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS prezzo_tariffa_3  NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS prezzo_tariffa_4  NUMERIC(8,2);

-- ─── APPUNTAMENTI: colonne mancanti ──────────────────────────────────────────
-- r[8]  = Osservazioni — note sull'appuntamento
-- r[9]  = Data dell'ultimo movimento — ultimo aggiornamento
-- r[11] = Risorse — risorse fisiche usate (cabine, attrezzature)
ALTER TABLE koibox_appuntamenti
  ADD COLUMN IF NOT EXISTS osservazioni          TEXT,
  ADD COLUMN IF NOT EXISTS data_ultimo_movimento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risorse               TEXT;
