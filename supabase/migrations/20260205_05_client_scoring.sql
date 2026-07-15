-- =====================================================
-- Migration: Client Scoring System
-- Data: 2026-02-05
-- Descrizione: Sistema punteggio clienti basato su obiettivi con bonus/malus
-- =====================================================

-- 1. Tabella punteggio aggregato per centro
CREATE TABLE IF NOT EXISTS client_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE UNIQUE,
  -- Punteggio totale (storico)
  punteggio_totale INTEGER DEFAULT 0,
  -- Punteggio mese corrente (reset mensile)
  punteggio_mese_corrente INTEGER DEFAULT 0,
  mese_riferimento DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  -- Contatori obiettivi
  obiettivi_completati INTEGER DEFAULT 0,
  obiettivi_in_anticipo INTEGER DEFAULT 0, -- completati prima della scadenza
  obiettivi_in_ritardo INTEGER DEFAULT 0,  -- completati dopo la scadenza
  obiettivi_non_raggiunti INTEGER DEFAULT 0, -- mai completati
  -- Streak (obiettivi consecutivi completati in tempo)
  streak_corrente INTEGER DEFAULT 0,
  streak_massimo INTEGER DEFAULT 0,
  -- Livello (basato su punteggio totale)
  livello INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN punteggio_totale >= 10000 THEN 10
      WHEN punteggio_totale >= 7500 THEN 9
      WHEN punteggio_totale >= 5000 THEN 8
      WHEN punteggio_totale >= 3500 THEN 7
      WHEN punteggio_totale >= 2500 THEN 6
      WHEN punteggio_totale >= 1500 THEN 5
      WHEN punteggio_totale >= 1000 THEN 4
      WHEN punteggio_totale >= 500 THEN 3
      WHEN punteggio_totale >= 200 THEN 2
      ELSE 1
    END
  ) STORED,
  -- Timestamps
  ultimo_obiettivo_completato_at TIMESTAMPTZ,
  ultima_attivita_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabella transazioni punteggio (storico dettagliato)
CREATE TABLE IF NOT EXISTS score_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES beauty_centers(id) ON DELETE CASCADE,
  obiettivo_id UUID REFERENCES obiettivi(id) ON DELETE SET NULL,
  -- Tipo transazione
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
    'completamento',      -- obiettivo completato (base 100 punti)
    'bonus_anticipo',     -- bonus per completamento anticipato
    'malus_ritardo',      -- penalità per ritardo
    'streak_bonus',       -- bonus per streak
    'reset_mensile',      -- reset punteggio mensile
    'bonus_admin',        -- bonus manuale da admin
    'malus_admin'         -- penalità manuale da admin
  )),
  -- Punti (positivo = aggiunto, negativo = sottratto)
  punti INTEGER NOT NULL,
  -- Dettagli per completamento obiettivo
  giorni_differenza INTEGER, -- positivo = anticipo, negativo = ritardo
  -- Saldo
  saldo_precedente INTEGER,
  saldo_nuovo INTEGER,
  -- Descrizione
  descrizione TEXT,
  -- Metadata
  eseguito_da UUID REFERENCES user_profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configurazione scoring (tabella di sistema)
CREATE TABLE IF NOT EXISTS scoring_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chiave VARCHAR(50) NOT NULL UNIQUE,
  valore INTEGER NOT NULL,
  descrizione TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserisci configurazione default
INSERT INTO scoring_config (chiave, valore, descrizione) VALUES
  ('punti_base_completamento', 100, 'Punti base per completamento obiettivo'),
  ('bonus_giorno_anticipo', 10, 'Punti bonus per ogni giorno di anticipo'),
  ('max_giorni_anticipo', 7, 'Massimo giorni di anticipo considerati per bonus'),
  ('malus_giorno_ritardo', 5, 'Punti penalità per ogni giorno di ritardo'),
  ('max_giorni_ritardo', 14, 'Massimo giorni di ritardo considerati per malus'),
  ('punti_minimi', 20, 'Punteggio minimo garantito per completamento'),
  ('streak_bonus_3', 25, 'Bonus per 3 obiettivi consecutivi in tempo'),
  ('streak_bonus_5', 50, 'Bonus per 5 obiettivi consecutivi in tempo'),
  ('streak_bonus_10', 100, 'Bonus per 10 obiettivi consecutivi in tempo')
ON CONFLICT (chiave) DO NOTHING;

-- 4. Indici per performance
CREATE INDEX IF NOT EXISTS idx_client_scores_centro ON client_scores(centro_id);
CREATE INDEX IF NOT EXISTS idx_client_scores_punteggio ON client_scores(punteggio_totale DESC);
CREATE INDEX IF NOT EXISTS idx_client_scores_livello ON client_scores(livello DESC);
CREATE INDEX IF NOT EXISTS idx_score_transactions_centro ON score_transactions(centro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_transactions_obiettivo ON score_transactions(obiettivo_id) WHERE obiettivo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_score_transactions_mese ON score_transactions(created_at) WHERE tipo != 'reset_mensile';

-- 5. RLS Policies per client_scores
ALTER TABLE client_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all scores" ON client_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

CREATE POLICY "HPA can view assigned center scores" ON client_scores
  FOR SELECT TO authenticated
  USING (
    centro_id IN (
      SELECT hca.centro_id FROM hpa_centro_assignments hca
      WHERE hca.hpa_id = auth.uid()
      AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
    )
  );

CREATE POLICY "Client can view own score" ON client_scores
  FOR SELECT TO authenticated
  USING (
    centro_id IN (SELECT up.centro_id FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 6. RLS Policies per score_transactions
ALTER TABLE score_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all score transactions" ON score_transactions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND ruolo_livello = 'admin')
  );

CREATE POLICY "HPA can view assigned center transactions" ON score_transactions
  FOR SELECT TO authenticated
  USING (
    centro_id IN (
      SELECT hca.centro_id FROM hpa_centro_assignments hca
      WHERE hca.hpa_id = auth.uid()
    )
  );

CREATE POLICY "Client can view own transactions" ON score_transactions
  FOR SELECT TO authenticated
  USING (
    centro_id IN (SELECT up.centro_id FROM user_profiles up WHERE up.id = auth.uid())
  );

-- 7. Funzione principale per calcolare e assegnare punteggio
CREATE OR REPLACE FUNCTION calcola_punteggio_obiettivo()
RETURNS TRIGGER AS $$
DECLARE
  v_punti INTEGER;
  v_giorni INTEGER;
  v_tipo VARCHAR(30);
  v_saldo_precedente INTEGER;
  v_streak INTEGER;
  v_config RECORD;
  v_in_tempo BOOLEAN;
BEGIN
  -- Solo quando stato cambia a 'completato'
  IF NEW.stato = 'completato' AND (OLD.stato IS NULL OR OLD.stato != 'completato') THEN

    -- Carica configurazione
    SELECT
      (SELECT valore FROM scoring_config WHERE chiave = 'punti_base_completamento') as punti_base,
      (SELECT valore FROM scoring_config WHERE chiave = 'bonus_giorno_anticipo') as bonus_anticipo,
      (SELECT valore FROM scoring_config WHERE chiave = 'max_giorni_anticipo') as max_anticipo,
      (SELECT valore FROM scoring_config WHERE chiave = 'malus_giorno_ritardo') as malus_ritardo,
      (SELECT valore FROM scoring_config WHERE chiave = 'max_giorni_ritardo') as max_ritardo,
      (SELECT valore FROM scoring_config WHERE chiave = 'punti_minimi') as punti_minimi
    INTO v_config;

    -- Calcola giorni di differenza (positivo = anticipo)
    v_giorni := COALESCE(NEW.data_target, NEW.data_fine, CURRENT_DATE) - CURRENT_DATE;

    -- Inizia con punti base
    v_punti := COALESCE(v_config.punti_base, 100);
    v_in_tempo := TRUE;

    -- Applica bonus/malus
    IF v_giorni > 0 THEN
      -- Completato in anticipo: bonus
      v_punti := v_punti + LEAST(v_giorni, COALESCE(v_config.max_anticipo, 7)) * COALESCE(v_config.bonus_anticipo, 10);
      v_tipo := 'bonus_anticipo';
    ELSIF v_giorni < 0 THEN
      -- Completato in ritardo: malus
      v_punti := v_punti - LEAST(ABS(v_giorni), COALESCE(v_config.max_ritardo, 14)) * COALESCE(v_config.malus_ritardo, 5);
      v_tipo := 'malus_ritardo';
      v_in_tempo := FALSE;
    ELSE
      -- Completato esattamente in tempo
      v_tipo := 'completamento';
    END IF;

    -- Applica minimo garantito
    v_punti := GREATEST(v_punti, COALESCE(v_config.punti_minimi, 20));

    -- Ottieni saldo precedente
    SELECT COALESCE(punteggio_totale, 0) INTO v_saldo_precedente
    FROM client_scores WHERE centro_id = NEW.centro_id;

    IF NOT FOUND THEN
      v_saldo_precedente := 0;
    END IF;

    -- Crea o aggiorna record score
    INSERT INTO client_scores (
      centro_id, punteggio_totale, punteggio_mese_corrente,
      obiettivi_completati, obiettivi_in_anticipo, obiettivi_in_ritardo,
      streak_corrente, ultimo_obiettivo_completato_at, ultima_attivita_at
    ) VALUES (
      NEW.centro_id, v_punti, v_punti,
      1,
      CASE WHEN v_giorni > 0 THEN 1 ELSE 0 END,
      CASE WHEN v_giorni < 0 THEN 1 ELSE 0 END,
      CASE WHEN v_in_tempo THEN 1 ELSE 0 END,
      NOW(), NOW()
    )
    ON CONFLICT (centro_id) DO UPDATE SET
      punteggio_totale = client_scores.punteggio_totale + v_punti,
      punteggio_mese_corrente = CASE
        WHEN client_scores.mese_riferimento = DATE_TRUNC('month', CURRENT_DATE)
        THEN client_scores.punteggio_mese_corrente + v_punti
        ELSE v_punti
      END,
      mese_riferimento = DATE_TRUNC('month', CURRENT_DATE),
      obiettivi_completati = client_scores.obiettivi_completati + 1,
      obiettivi_in_anticipo = client_scores.obiettivi_in_anticipo + CASE WHEN v_giorni > 0 THEN 1 ELSE 0 END,
      obiettivi_in_ritardo = client_scores.obiettivi_in_ritardo + CASE WHEN v_giorni < 0 THEN 1 ELSE 0 END,
      streak_corrente = CASE WHEN v_in_tempo THEN client_scores.streak_corrente + 1 ELSE 0 END,
      streak_massimo = GREATEST(
        client_scores.streak_massimo,
        CASE WHEN v_in_tempo THEN client_scores.streak_corrente + 1 ELSE client_scores.streak_corrente END
      ),
      ultimo_obiettivo_completato_at = NOW(),
      ultima_attivita_at = NOW(),
      updated_at = NOW();

    -- Registra transazione
    INSERT INTO score_transactions (
      centro_id, obiettivo_id, tipo, punti, giorni_differenza,
      saldo_precedente, saldo_nuovo, descrizione
    ) VALUES (
      NEW.centro_id, NEW.id, v_tipo, v_punti, v_giorni,
      v_saldo_precedente, v_saldo_precedente + v_punti,
      'Completamento obiettivo: ' || COALESCE(NEW.nome, 'N/D') ||
      CASE
        WHEN v_giorni > 0 THEN ' (' || v_giorni || ' giorni in anticipo)'
        WHEN v_giorni < 0 THEN ' (' || ABS(v_giorni) || ' giorni in ritardo)'
        ELSE ' (in tempo)'
      END
    );

    -- Controlla streak bonus
    SELECT streak_corrente INTO v_streak FROM client_scores WHERE centro_id = NEW.centro_id;

    IF v_streak = 3 THEN
      PERFORM add_streak_bonus(NEW.centro_id, 3);
    ELSIF v_streak = 5 THEN
      PERFORM add_streak_bonus(NEW.centro_id, 5);
    ELSIF v_streak = 10 THEN
      PERFORM add_streak_bonus(NEW.centro_id, 10);
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Funzione per aggiungere bonus streak
CREATE OR REPLACE FUNCTION add_streak_bonus(p_centro_id UUID, p_streak_level INTEGER)
RETURNS VOID AS $$
DECLARE
  v_bonus INTEGER;
  v_saldo_precedente INTEGER;
BEGIN
  SELECT valore INTO v_bonus FROM scoring_config
  WHERE chiave = 'streak_bonus_' || p_streak_level;

  IF v_bonus IS NULL THEN RETURN; END IF;

  SELECT punteggio_totale INTO v_saldo_precedente FROM client_scores WHERE centro_id = p_centro_id;

  UPDATE client_scores
  SET punteggio_totale = punteggio_totale + v_bonus,
      punteggio_mese_corrente = punteggio_mese_corrente + v_bonus,
      updated_at = NOW()
  WHERE centro_id = p_centro_id;

  INSERT INTO score_transactions (
    centro_id, tipo, punti, saldo_precedente, saldo_nuovo, descrizione
  ) VALUES (
    p_centro_id, 'streak_bonus', v_bonus,
    v_saldo_precedente, v_saldo_precedente + v_bonus,
    'Bonus streak: ' || p_streak_level || ' obiettivi consecutivi!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger su obiettivi
DROP TRIGGER IF EXISTS trigger_score_on_obiettivo_complete ON obiettivi;
CREATE TRIGGER trigger_score_on_obiettivo_complete
  AFTER UPDATE ON obiettivi
  FOR EACH ROW
  EXECUTE FUNCTION calcola_punteggio_obiettivo();

-- 10. Vista ranking clienti per HPA
CREATE OR REPLACE VIEW client_ranking AS
SELECT
  cs.centro_id,
  bc.nome as centro_nome,
  cs.punteggio_totale,
  cs.punteggio_mese_corrente,
  cs.livello,
  cs.obiettivi_completati,
  cs.obiettivi_in_anticipo,
  cs.obiettivi_in_ritardo,
  cs.streak_corrente,
  cs.streak_massimo,
  cs.ultimo_obiettivo_completato_at,
  cs.ultima_attivita_at,
  RANK() OVER (ORDER BY cs.punteggio_totale DESC) as rank_totale,
  RANK() OVER (ORDER BY cs.punteggio_mese_corrente DESC) as rank_mese
FROM client_scores cs
JOIN beauty_centers bc ON bc.id = cs.centro_id
ORDER BY cs.punteggio_totale DESC;

-- 11. Funzione per ottenere ranking filtrato per HPA
CREATE OR REPLACE FUNCTION get_hpa_client_ranking(p_hpa_id UUID)
RETURNS TABLE (
  centro_id UUID,
  centro_nome TEXT,
  punteggio_totale INTEGER,
  punteggio_mese INTEGER,
  livello INTEGER,
  obiettivi_completati INTEGER,
  streak_corrente INTEGER,
  rank_position BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.centro_id,
    bc.nome::TEXT as centro_nome,
    cs.punteggio_totale,
    cs.punteggio_mese_corrente as punteggio_mese,
    cs.livello,
    cs.obiettivi_completati,
    cs.streak_corrente,
    RANK() OVER (ORDER BY cs.punteggio_totale DESC) as rank_position
  FROM client_scores cs
  JOIN beauty_centers bc ON bc.id = cs.centro_id
  WHERE cs.centro_id IN (
    SELECT hca.centro_id FROM hpa_centro_assignments hca
    WHERE hca.hpa_id = p_hpa_id
    AND (hca.data_fine IS NULL OR hca.data_fine >= CURRENT_DATE)
  )
  ORDER BY cs.punteggio_totale DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE client_scores IS 'Punteggio aggregato clienti basato su obiettivi raggiunti';
COMMENT ON TABLE score_transactions IS 'Storico transazioni punteggio con dettaglio bonus/malus';
COMMENT ON TABLE scoring_config IS 'Configurazione sistema di scoring (punti, bonus, malus)';
COMMENT ON FUNCTION calcola_punteggio_obiettivo IS 'Trigger function per calcolare punteggio automaticamente';
