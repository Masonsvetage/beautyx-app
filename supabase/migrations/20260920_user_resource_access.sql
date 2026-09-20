-- =====================================================
-- Migration: tracciamento interno risorse gratuite/acquistate per utente
-- Data: 2026-09-20
-- Autore: Davide
-- Contesto: correzione diretta di Mason al modello commerciale (task #206,
--           vedi memory/generale.md, voce "Modello commerciale corretto
--           (20/09/2026) — niente 'credito abbonamento' in pubblico, tool
--           sempre con account, bundle post-90gg").
--
-- Decisioni che questa tabella predispone (NESSUNA esposta in UI oggi):
--  1) Il credito sull'abbonamento futuro non e' pubblicizzato ora, ma va
--     tracciato da subito COSA un utente ha ottenuto/comprato e QUANTO ha
--     effettivamente pagato (non il valore nominale) - serve al giorno in
--     cui la piattaforma sara' pronta e Beautyx proporra' l'abbonamento con
--     uno sconto pari al valore realmente pagato.
--  2) Il bundle Identikit+Tool post-90gg (70€, non 60+29=89€) e' un
--     concetto che questa tabella sa gia' rappresentare (risorsa='bundle',
--     importo_pagato=70.00) - il flusso di acquisto/checkout resta fuori
--     scope, non esiste ancora nessun checkout Stripe per queste risorse.
--  3) Registrazione unificata: durante i 90gg, la scelta fatta su /signup
--     (Identikit / Tool / entrambi) genera qui una riga per risorsa
--     selezionata con importo_pagato=0 (tipo_accesso='gratuito_90gg') -
--     serve solo per tracciamento/analisi, NON e' un cancello di accesso
--     (durante i 90gg entrambe le risorse restano comunque gratuite per
--     qualunque utente autenticato, vedi app/listino/page.js e
--     app/api/user/resource-access/route.js - la selezione qui non nega
--     l'accesso a chi non ha selezionato una risorsa, registra solo
--     l'intento dichiarato al momento della registrazione).
--
-- NON APPLICATA al database di produzione - solo file, come da convenzione
-- del team per modifiche schema che non sono state esplicitamente
-- autorizzate nel prompt diretto di Mason a questa sessione (vedi
-- memory/davide.md, voce "Autorizzazione tracciata" 2026-09-19: un
-- subagente non puo' mai verificare in modo indipendente un'autorizzazione
-- relayata nel proprio prompt). Verificata solo sintatticamente (lettura
-- manuale, confronto con lo stile delle migration esistenti, es.
-- 20260828_profiling_report_care.sql, 20260211_subscription_system.sql).
-- =====================================================

CREATE TABLE IF NOT EXISTS user_resource_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  centro_id UUID REFERENCES beauty_centers(id) ON DELETE SET NULL,

  -- Risorsa a cui questa riga si riferisce. 'bundle' e' una riga a parte
  -- (non sostituisce le due righe singole 'identikit'/'tool') usata SOLO
  -- per un acquisto post-90gg in bundle a 70€ - permette di distinguere
  -- "ha comprato bundle a 70€" da "ha comprato le due risorse separate a
  -- 60+29=89€" quando in futuro si calcola lo sconto sull'abbonamento sul
  -- valore REALMENTE pagato, non sulla somma nominale.
  risorsa TEXT NOT NULL CHECK (risorsa IN ('identikit', 'tool', 'bundle')),

  -- 'gratuito_90gg': ottenuto senza pagare durante la finestra di lancio.
  -- 'pagato': acquisto singolo one-time (60€ Identikit o 29€ Tool) a prezzo
  --           pieno, dopo la finestra - nessun checkout reale implementato
  --           oggi, valore predisposto per quando esistera'.
  -- 'bundle_pagato': acquisto post-90gg in bundle Identikit+Tool a 70€.
  tipo_accesso TEXT NOT NULL DEFAULT 'gratuito_90gg'
    CHECK (tipo_accesso IN ('gratuito_90gg', 'pagato', 'bundle_pagato')),

  -- Importo REALMENTE pagato (non il prezzo nominale) - 0 durante i 90gg
  -- gratuiti. Per una riga 'bundle' e' il totale del bundle (70.00), non
  -- diviso tra le due risorse - e' la riga stessa a rappresentare l'unita'
  -- di acquisto.
  importo_pagato DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- true se la risorsa e' stata selezionata esplicitamente nel form di
  -- registrazione (/signup) - false se aggiunta in un momento successivo
  -- (es. un utente gia' registrato solo per l'Identikit che in seguito
  -- apre anche /listino durante la finestra gratuita).
  richiesta_al_signup BOOLEAN NOT NULL DEFAULT false,

  -- Valorizzato solo per un futuro acquisto reale via Stripe (oggi sempre
  -- NULL - nessun checkout esiste ancora per queste risorse).
  stripe_checkout_session_id TEXT,

  data_concessione TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Una sola riga per utente+risorsa: un secondo "ottenimento" della stessa
  -- risorsa (es. rigrant idempotente al login) aggiorna la riga esistente,
  -- non ne crea una seconda. Nota: questo consente al massimo una riga
  -- 'bundle' per utente - coerente con "il bundle e' un acquisto unico".
  UNIQUE (user_id, risorsa)
);

COMMENT ON TABLE user_resource_access IS 'Tracciamento interno (non esposto in UI) di quali risorse (identikit/tool/bundle) un utente ha ottenuto gratis o pagato, e quanto ha REALMENTE pagato - predisposto per il futuro sconto sull''abbonamento piattaforma pari al valore pagato, vedi memory/generale.md 20/09/2026';
COMMENT ON COLUMN user_resource_access.importo_pagato IS 'Valore REALMENTE pagato, non il prezzo nominale - per un bundle a 70€ non e'' 60+29=89, e'' 70';
COMMENT ON COLUMN user_resource_access.richiesta_al_signup IS 'true se scelta esplicitamente nel form /signup (checkbox Identikit/Tool/entrambi), false se ottenuta in un momento successivo';

CREATE INDEX IF NOT EXISTS idx_user_resource_access_user_id ON user_resource_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resource_access_centro_id ON user_resource_access(centro_id);

-- =====================================================
-- RLS - stesso pattern gia' in uso per user_purchases/profiling_*: lettura
-- consentita solo al proprietario della riga, scrittura riservata al
-- service role (le route API scrivono sempre con SUPABASE_SERVICE_KEY dopo
-- verifica esplicita della sessione, mai fidandosi di un centro_id/user_id
-- passato dal client per l'insert).
-- =====================================================
ALTER TABLE user_resource_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utente vede le proprie risorse" ON user_resource_access;
CREATE POLICY "Utente vede le proprie risorse" ON user_resource_access
  FOR SELECT USING (user_id = auth.uid());

SELECT 'Migration completata: tabella user_resource_access (tracciamento interno risorse gratuite/acquistate) + RLS' AS info;
