-- ============================================================
-- ESEGUI_fix_subscriptions_unique.sql
-- Problema: user_subscriptions non aveva UNIQUE su user_id,
-- quindi ogni assegnazione admin creava una nuova riga invece
-- di aggiornare quella esistente.
-- Fix:
--   1. Per ogni utente con più righe, tieni solo quella con
--      priorità massima (attivo > trial > altri, poi created_at DESC)
--      e cancella le altre
--   2. Aggiungi UNIQUE constraint su user_id
-- ============================================================

-- STEP 1: Identifica la riga "vincente" per ogni utente
-- (stesso criterio di get_user_subscription)
WITH ranked AS (
  SELECT
    id,
    user_id,
    stato,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN assegnato_da_admin = true THEN 0 ELSE 1 END ASC,
        CASE stato
          WHEN 'attivo'     THEN 1
          WHEN 'trial'      THEN 2
          WHEN 'sospeso'    THEN 3
          WHEN 'scaduto'    THEN 4
          WHEN 'cancellato' THEN 5
          ELSE 6
        END ASC,
        created_at DESC
    ) AS rn
  FROM user_subscriptions
),
-- STEP 2: Segna le righe da eliminare (duplicati: rn > 1)
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM user_subscriptions
WHERE id IN (SELECT id FROM to_delete);

-- STEP 3: Aggiungi UNIQUE constraint (se non esiste già)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'user_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'user_subscriptions_user_id_key'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;
