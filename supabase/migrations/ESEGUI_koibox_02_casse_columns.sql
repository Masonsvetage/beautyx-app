-- ─── koibox_casse: aggiunte colonne mancanti ─────────────────────────────────
-- Eseguire in Supabase Dashboard → SQL Editor

ALTER TABLE koibox_casse
  ADD COLUMN IF NOT EXISTS incasso_coupon        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_bizum         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_paypal        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_carta_regalo  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incasso_carta_fedelta NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debiti_contanti       NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debiti_carta          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debiti_altri          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apertura_cassa        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contanti_in_cassa     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS differenza_cassa      NUMERIC(10,2) DEFAULT 0;
