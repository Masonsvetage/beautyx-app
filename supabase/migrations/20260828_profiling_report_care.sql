-- =====================================================
-- Migration: Report di profiling CARE — schema questionario e punteggi
-- Data: 2026-08-28
-- Autore: Davide
-- Descrizione: tabelle per salvare le risposte al questionario di
--              profiling (scelte forzate ipsative + narrazioni libere),
--              i punteggi calcolati per elemento (Fuoco/Acqua/Aria/Terra/
--              Metallo) e il report finale assemblato. Metodologia completa
--              in beautyx-report-profiling-note.md.
--
-- NON APPLICATA al database di produzione — solo file, come da richiesta.
-- Verificata solo sintatticamente (lettura manuale + confronto con lo stile
-- delle migration esistenti, es. 20260211_subscription_system.sql).
--
-- ⚠️ SCOPERTA IMPORTANTE (29/08/2026, verificata query diretta su Supabase
-- MCP contro il progetto scfumedmisbuxhdywwpb, l'unico ACTIVE_HEALTHY):
-- NESSUNA delle tabelle da cui questa migration dipende esiste oggi in
-- produzione — subscription_plans, user_subscriptions, user_purchases E
-- agent_prompts sono TUTTE assenti (list_tables mostra solo 19 tabelle,
-- nessuna di queste). Questo file, se eseguito da solo, fallirebbe subito
-- sulla FK di profiling_reports.purchase_id -> user_purchases(id) e
-- sull'INSERT in subscription_plans (tabella inesistente). user_profiles e
-- beauty_centers esistono ma hanno 0 righe: zero utenti/centri reali in
-- produzione oggi, coerente con "prodotto non ancora lanciato pubblicamente"
-- — non un errore mio, uno stato di fatto pre-esistente. ORDINE DI
-- APPLICAZIONE CORRETTO se/quando Mason decide di procedere: prima
-- 20260211_subscription_system.sql (crea subscription_plans/user_subscriptions/
-- user_purchases/check_ai_limit), poi ESEGUI_agent_prompts_01.sql (crea
-- agent_prompts), poi questo file, poi ESEGUI_agent_prompts_02_beautyx_
-- profiling.sql. Non ho applicato nulla di questa catena io stesso in questa
-- sessione: è una decisione più grande dei 3 compiti di oggi, segnalata al
-- Coordinatore/Mason invece di agire da solo (vedi memory/davide.md 29/08/2026).
--
-- Dipendenze: beauty_centers, user_profiles, user_purchases, subscription_plans
-- (tutte già esistenti — vedi supabase/migrations/20260211_subscription_system.sql
-- e le migration di onboarding/auth).
--
-- Aggiornamento 28/08/2026 (chiarimento di Mason sul flusso di acquisto):
-- l'acquisto del report avviene sempre da un utente GIA' autenticato con
-- centro_id gia' assegnato (registrazione gratuita standard, poi acquisto
-- one-time da loggati) — non esiste piu' lo scenario "provisioning
-- Stripe->account nuovo". Le tabelle profiling_* sotto erano gia' scritte
-- in modo compatibile con questo flusso (centro_id/user_id NOT NULL,
-- presuppongono un account gia' esistente) e non richiedono modifiche
-- strutturali. L'unico adattamento aggiunto qui e' la sezione 8 in fondo
-- (CHECK su user_purchases.tipo), che copre un gap reale trovato nel codice
-- applicativo: ne' app/api/subscriptions/checkout/route.js ne'
-- app/api/webhooks/stripe/route.js supportano oggi l'acquisto di un piano
-- subscription_plans (solo pacchetti minuti HPA e addon token) — quella
-- parte resta lavoro applicativo da scrivere (vedi
-- piano-sviluppo-report-care.md, punto 2b), non risolvibile solo con SQL.
-- =====================================================

-- =====================================================
-- 1. TABELLA profiling_sessions
-- Una riga per sessione di profiling di un centro. Traccia lo stato di
-- avanzamento (fase adattiva: nucleo -> riserva -> narrazione -> completato)
-- e quali scenari sono già stati somministrati, per non ripescarli e per
-- rispettare il tetto massimo (non oltre il doppio del nucleo base).
-- =====================================================
CREATE TABLE IF NOT EXISTS profiling_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Collegamento all'acquisto che ha sbloccato questa sessione (nullable:
  -- una sessione potrebbe essere creata a mano per test/demo interna)
  purchase_id UUID REFERENCES user_purchases(id),

  -- Collegamento al filo di conversazione della chat Beautyx esistente,
  -- cosi' la sessione di profiling resta nello stesso contesto conversazionale
  conversation_id UUID,

  stato TEXT NOT NULL DEFAULT 'in_corso'
    CHECK (stato IN ('in_corso', 'completato', 'abbandonato')),

  -- Fase corrente della somministrazione adattiva
  fase TEXT NOT NULL DEFAULT 'nucleo'
    CHECK (fase IN ('nucleo', 'riserva', 'narrazione', 'completato')),

  -- Ambito su cui si sta lavorando in questo momento (nullable: non
  -- significativo durante la fase 'completato')
  ambito_corrente TEXT
    CHECK (ambito_corrente IS NULL OR ambito_corrente IN ('clienti', 'personale', 'spese')),

  -- Codici degli scenari a scelta forzata gia' somministrati (es. 'C1','P4','S2'),
  -- per non ripescarli ed applicare il tetto massimo (2x nucleo base)
  scenari_somministrati TEXT[] NOT NULL DEFAULT '{}',

  -- Quante narrazioni libere sono gia' state raccolte (max 3: clienti/personale/spese)
  narrazioni_completate TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE profiling_sessions IS 'Sessione di profiling CARE di un centro: stato di avanzamento del questionario adattivo';
COMMENT ON COLUMN profiling_sessions.scenari_somministrati IS 'Codici scenario gia'' proposti (nucleo + eventuale riserva), per evitare ripetizioni';

CREATE INDEX IF NOT EXISTS idx_profiling_sessions_centro_id ON profiling_sessions(centro_id);
CREATE INDEX IF NOT EXISTS idx_profiling_sessions_user_id ON profiling_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiling_sessions_stato ON profiling_sessions(stato);

-- Una sola sessione ATTIVA alla volta per centro (indice unico parziale,
-- non un vincolo UNIQUE(centro_id,stato) pieno: quello impedirebbe
-- erroneamente piu' sessioni storiche 'completato'/'abbandonato' nel tempo,
-- che invece devono poter esistere). Consente invece sempre una sola riga
-- 'in_corso' per centro.
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiling_sessions_centro_attiva
  ON profiling_sessions(centro_id) WHERE stato = 'in_corso';

-- =====================================================
-- 2. TABELLA profiling_scenario_responses
-- Una riga per ogni scenario a scelta forzata (ipsativo, ordinamento
-- completo delle 5 opzioni) a cui la titolare ha risposto.
-- =====================================================
CREATE TABLE IF NOT EXISTS profiling_scenario_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES profiling_sessions(id) ON DELETE CASCADE,

  scenario_code TEXT NOT NULL,              -- es. 'C1', 'P4', 'S2' (vedi banco-domande-profiling.md)
  ambito TEXT NOT NULL
    CHECK (ambito IN ('clienti', 'personale', 'spese')),

  -- Ordinamento completo dato dalla titolare: posizione (1=piu' proprio,
  -- 5=meno proprio) -> elemento. Esempio:
  -- {"1":"fuoco","2":"metallo","3":"acqua","4":"terra","5":"aria"}
  ordinamento JSONB NOT NULL,

  -- Punteggi gia' calcolati (4/3/2/1/0 per posizione) per elemento,
  -- calcolo deterministico lato client MA rivalidato/ricalcolato server-side
  -- prima del salvataggio (mai fidarsi solo del client per un dato che
  -- determina il contenuto del report pagato)
  punteggi JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, scenario_code)
);

COMMENT ON TABLE profiling_scenario_responses IS 'Risposte ipsative (ordinamento a 5) agli scenari a scelta forzata del questionario CARE';
COMMENT ON COLUMN profiling_scenario_responses.ordinamento IS 'JSONB posizione(1-5) -> elemento (fuoco/acqua/aria/terra/metallo), ordinamento completo dato dalla titolare';
COMMENT ON COLUMN profiling_scenario_responses.punteggi IS 'JSONB elemento -> punti (4/3/2/1/0), calcolo deterministico ricalcolato server-side';

CREATE INDEX IF NOT EXISTS idx_profiling_scenario_responses_session_id ON profiling_scenario_responses(session_id);

-- =====================================================
-- 3. TABELLA profiling_narrative_responses
-- Una riga per ciascuna delle narrazioni libere (max 3: relazioni
-- interpersonali su clienti/personale, consapevolezza gestionale su spese)
-- con le rispettive 3 domande di controllo fisse.
-- =====================================================
CREATE TABLE IF NOT EXISTS profiling_narrative_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES profiling_sessions(id) ON DELETE CASCADE,

  ambito TEXT NOT NULL
    CHECK (ambito IN ('clienti', 'personale', 'spese')),

  narrazione_libera TEXT NOT NULL,

  -- Le 3 domande di controllo sono fisse per tipo di ambito (vedi
  -- beautyx-report-profiling-note.md, sezione "Metodologia del questionario"):
  -- clienti/personale -> "Come ha reagito l'altra persona?" / "Come avresti
  -- percepito, al posto suo, il tuo comportamento?" / "Quale altro
  -- comportamento avresti potuto adottare, e perche' lo hai scartato?"
  -- spese -> "Spesa pura o investimento?" / "In quanto tempo la recuperi?" /
  -- "Avresti potuto affrontarla diversamente dal punto di vista economico?"
  risposta_controllo_1 TEXT,
  risposta_controllo_2 TEXT,
  risposta_controllo_3 TEXT,

  -- Output del motore di analisi AI (vedi piano-sviluppo-report-care.md,
  -- punto 6): elemento_coerente, note_giustificazione, sintesi_breve.
  -- NULL finche' l'analisi non e' stata eseguita.
  analisi_ai JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, ambito)
);

COMMENT ON TABLE profiling_narrative_responses IS 'Narrazioni libere + domande di controllo del questionario CARE, con analisi AI associata';
COMMENT ON COLUMN profiling_narrative_responses.analisi_ai IS 'JSONB output motore analisi testo: {elemento_coerente, note_giustificazione, sintesi_breve}, popolato async dopo il salvataggio';

CREATE INDEX IF NOT EXISTS idx_profiling_narrative_responses_session_id ON profiling_narrative_responses(session_id);

-- =====================================================
-- 4. TABELLA profiling_element_scores
-- Punteggio aggregato finale per sessione: totali per i 5 elementi (globali
-- e per singolo ambito), e il blocco individuato secondo il meccanismo a 3
-- nodi (eccesso -> controllore carente -> leva/nutritore del controllore).
-- =====================================================
CREATE TABLE IF NOT EXISTS profiling_element_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES profiling_sessions(id) ON DELETE CASCADE UNIQUE,

  -- Totali globali (somma su tutti gli scenari somministrati, nucleo + riserva)
  punti_fuoco INTEGER NOT NULL DEFAULT 0,
  punti_acqua INTEGER NOT NULL DEFAULT 0,
  punti_aria INTEGER NOT NULL DEFAULT 0,
  punti_terra INTEGER NOT NULL DEFAULT 0,
  punti_metallo INTEGER NOT NULL DEFAULT 0,

  -- Breakdown per ambito, per poter individuare eccessi/carenze localizzati
  -- (es. molto Fuoco con lo staff ma molta Terra sui soldi). Struttura:
  -- {"clienti":{"fuoco":..,"acqua":..,...}, "personale":{...}, "spese":{...}}
  breakdown_per_ambito JSONB NOT NULL DEFAULT '{}',

  -- Blocco individuato (meccanismo unificato, vedi
  -- beautyx-report-profiling-note.md sezione "Individuazione dei blocchi")
  elemento_dominante TEXT
    CHECK (elemento_dominante IS NULL OR elemento_dominante IN ('fuoco', 'acqua', 'aria', 'terra', 'metallo')),
  elemento_eccesso TEXT
    CHECK (elemento_eccesso IS NULL OR elemento_eccesso IN ('fuoco', 'acqua', 'aria', 'terra', 'metallo')),
  elemento_carenza TEXT
    CHECK (elemento_carenza IS NULL OR elemento_carenza IN ('fuoco', 'acqua', 'aria', 'terra', 'metallo')),
  leva_riequilibrio TEXT
    CHECK (leva_riequilibrio IS NULL OR leva_riequilibrio IN ('fuoco', 'acqua', 'aria', 'terra', 'metallo')),

  -- Variante di narrazione da usare nell'assemblaggio report (vedi
  -- contenuti-report-5-elementi.md: 2 varianti eccesso non compensato
  -- (trasversale/localizzato) + 1 carenza non nutrita)
  tipo_blocco TEXT
    CHECK (tipo_blocco IS NULL OR tipo_blocco IN ('eccesso_trasversale', 'eccesso_localizzato', 'carenza_non_nutrita')),

  calcolato_al TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiling_element_scores IS 'Punteggi finali aggregati per elemento (globali e per ambito) + blocco individuato, calcolati a fine questionario';
COMMENT ON COLUMN profiling_element_scores.elemento_carenza IS 'Controllore carente = successivo di elemento_eccesso nel ciclo di controllo (tabella fissa, vedi nota metodologica)';
COMMENT ON COLUMN profiling_element_scores.leva_riequilibrio IS 'Nutritore del controllore carente nel ciclo generativo (tabella fissa, vedi nota metodologica)';

-- =====================================================
-- 5. TABELLA profiling_reports
-- Il report finale assemblato dinamicamente da punteggi + varianti di testo
-- (Federica). Formato-agnostico: contenuto_json riusabile sia per resa web
-- sia per un eventuale PDF futuro (decisione di formato non ancora presa).
-- =====================================================
CREATE TABLE IF NOT EXISTS profiling_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES profiling_sessions(id) ON DELETE CASCADE UNIQUE,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES user_purchases(id),

  -- Struttura dati del report assemblato (le 5 parti della "Struttura
  -- proposta del report" in beautyx-report-profiling-note.md), riusabile
  -- per qualunque formato di resa
  contenuto_json JSONB NOT NULL DEFAULT '{}',

  -- Versione pronta per la resa web (HTML gia' formattato)
  contenuto_html TEXT,

  stato TEXT NOT NULL DEFAULT 'bozza'
    CHECK (stato IN ('bozza', 'generato', 'consegnato')),

  generato_il TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiling_reports IS 'Report finale CARE assemblato da punteggi + contenuti Federica, formato-agnostico (web/PDF)';

CREATE INDEX IF NOT EXISTS idx_profiling_reports_centro_id ON profiling_reports(centro_id);

-- =====================================================
-- 6. Nuovo piano 'report_profiling' in subscription_plans
-- Riusa l'infrastruttura piano/tier esistente per il tool-gating della
-- modalita' profiling nella chat (vedi piano-sviluppo-report-care.md, punto
-- 4). Piano assegnato manualmente dal webhook Stripe al momento
-- dell'acquisto del report, non in vendita nella pagina pubblica piani.
-- token_ai_mensili prudenziale: da ricalibrare dopo un test reale del costo
-- per persona del motore di analisi testo libero (piano, punto 6).
-- =====================================================
INSERT INTO subscription_plans (
  codice, nome, descrizione,
  prezzo_mensile, prezzo_annuale,
  token_ai_mensili, ore_hpa_mensili,
  centri_max, utenti_max,
  funzionalita,
  is_free, is_trial, durata_trial_giorni,
  ordine, attivo
) VALUES (
  'report_profiling',
  'Report di profiling CARE',
  'Piano assegnato a chi ha acquistato solo il report di profiling: accesso esclusivo alla modalita'' profiling della chat Beautyx, nessuna funzionalita'' gestionale avanzata',
  0, 0,
  20000, 0,
  1, 1,
  ARRAY['profiling_quiz'],
  FALSE, FALSE, 0,
  0, TRUE
)
ON CONFLICT (codice) DO NOTHING;

-- =====================================================
-- 7. RLS (Row Level Security)
-- Stesso pattern gia' in uso per user_subscriptions/user_purchases:
-- lettura consentita solo al centro proprietario, derivato da
-- user_profiles.centro_id (mai da input client). Scrittura riservata al
-- service role (le route API scrivono sempre con SUPABASE_SERVICE_KEY dopo
-- verifyCentroOwnership applicativo, stesso principio gia' in uso per le
-- altre tabelle della chat Beautyx).
-- =====================================================

ALTER TABLE profiling_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Centro vede le proprie sessioni di profiling" ON profiling_sessions;
CREATE POLICY "Centro vede le proprie sessioni di profiling" ON profiling_sessions
  FOR SELECT USING (
    centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
  );

ALTER TABLE profiling_scenario_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Centro vede le proprie risposte scenario" ON profiling_scenario_responses;
CREATE POLICY "Centro vede le proprie risposte scenario" ON profiling_scenario_responses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM profiling_sessions
      WHERE centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
    )
  );

ALTER TABLE profiling_narrative_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Centro vede le proprie narrazioni" ON profiling_narrative_responses;
CREATE POLICY "Centro vede le proprie narrazioni" ON profiling_narrative_responses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM profiling_sessions
      WHERE centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
    )
  );

ALTER TABLE profiling_element_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Centro vede i propri punteggi" ON profiling_element_scores;
CREATE POLICY "Centro vede i propri punteggi" ON profiling_element_scores
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM profiling_sessions
      WHERE centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
    )
  );

ALTER TABLE profiling_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Centro vede il proprio report" ON profiling_reports;
CREATE POLICY "Centro vede il proprio report" ON profiling_reports
  FOR SELECT USING (
    centro_id IN (SELECT centro_id FROM user_profiles WHERE id = auth.uid())
  );

-- =====================================================
-- 8. Estensione CHECK su user_purchases.tipo — logging esplicito
-- dell'acquisto one-time del report.
-- Gap trovato leggendo 20260211_subscription_system.sql: il CHECK originale
-- ammette solo ('abbonamento','addon','upgrade'). Il nuovo webhook branch
-- per l'acquisto del report (piano-sviluppo-report-care.md, punto 2b)
-- potrebbe riusare 'upgrade' senza alcuna modifica (semanticamente valido:
-- e' un upgrade di piano per un utente gia' esistente) — questa ALTER e'
-- pero' preferibile per chiarezza in reportistica/query admin future,
-- cosi' l'acquisto del report resta distinguibile da un upgrade generico
-- di abbonamento. Postgres non supporta ALTER di un CHECK esistente: va
-- droppato e ricreato con il valore in piu'.
-- =====================================================
ALTER TABLE user_purchases DROP CONSTRAINT IF EXISTS user_purchases_tipo_check;
ALTER TABLE user_purchases ADD CONSTRAINT user_purchases_tipo_check
  CHECK (tipo IN ('abbonamento', 'addon', 'upgrade', 'report_profiling'));

COMMENT ON COLUMN user_purchases.tipo IS 'Tipo di acquisto: abbonamento (piano ricorrente), addon (top-up token AI), upgrade (cambio piano generico), report_profiling (acquisto one-time report CARE, vedi piano-sviluppo-report-care.md punto 2b)';

SELECT 'Migration completata: 5 tabelle profiling CARE + piano report_profiling + estensione user_purchases.tipo, RLS applicata' AS info;
