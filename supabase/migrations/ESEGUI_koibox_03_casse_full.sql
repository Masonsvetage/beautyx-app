-- Aggiunge le colonne mancanti di koibox_casse per catturare TUTTI i campi del file Koibox
-- Eseguire nel SQL Editor di Supabase (dopo ESEGUI_koibox_01 e _02)
--
-- Mappa colonne file Casse.xlsx:
--   r[2]  = incasso_contanti      (già presente)
--   r[3]  = incasso_carta         (già presente)
--   r[4]  = incasso_online        (già presente)
--   r[5]  = incasso_bonifico      (già presente)
--   r[6]  = incasso_coupon        ← nuovo
--   r[7]  = incasso_bizum         ← nuovo
--   r[8]  = incasso_paypal        ← nuovo
--   r[9]  = incasso_carta_regalo  ← nuovo
--   r[10] = incasso_carta_fedelta ← nuovo
--   r[11] = debiti_contanti       (già presente da _02)
--   r[12] = debiti_carta          (già presente da _02)
--   r[13] = debiti_altri          (già presente da _02)
--   r[14] = n_coupon              ← nuovo
--   r[15] = contanti_in_cassa     ← nuovo
--   r[16] = quantita_reale_cassa  ← nuovo
--   r[17] = differenza_cassa      ← nuovo
--   r[18] = totale_giorno         (già presente)

ALTER TABLE koibox_casse
  ADD COLUMN IF NOT EXISTS incasso_coupon        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_bizum         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_paypal        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_carta_regalo  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_carta_fedelta NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS n_coupon              INTEGER,
  ADD COLUMN IF NOT EXISTS contanti_in_cassa     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantita_reale_cassa  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS differenza_cassa      NUMERIC(10,2) DEFAULT 0;
