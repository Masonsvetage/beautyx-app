-- Migration: Aggiungi tipo_versamento e percentuale_incasso alla tabella accantonamenti
-- Data: 2025-01-07
-- Scopo: Permettere accantonamenti con allocazione automatica (%, fisso mensile, manuale)

-- Aggiungi colonne tipo_versamento e percentuale_incasso
ALTER TABLE accantonamenti
ADD COLUMN tipo_versamento VARCHAR(30) DEFAULT 'manuale'
  CHECK (tipo_versamento IN ('fisso_mensile', 'percentuale_incasso', 'manuale')),
ADD COLUMN percentuale_incasso DECIMAL(5,2) DEFAULT 0
  CHECK (percentuale_incasso >= 0 AND percentuale_incasso <= 100);

-- Commenti per documentazione
COMMENT ON COLUMN accantonamenti.tipo_versamento IS
  'Tipo di versamento: fisso_mensile (contributo mensile fisso), percentuale_incasso (% sugli incassi), manuale (solo contributi manuali)';

COMMENT ON COLUMN accantonamenti.percentuale_incasso IS
  'Percentuale da accantonare sugli incassi (es: 22 per IVA 22%). Usato solo se tipo_versamento = percentuale_incasso';

-- Aggiorna IVA esistente per usare percentuale_incasso (solo se esistono record)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accantonamenti WHERE nome ILIKE '%iva%' OR nome ILIKE '%imposta%') THEN
    UPDATE accantonamenti
    SET tipo_versamento = 'percentuale_incasso', percentuale_incasso = 22
    WHERE nome ILIKE '%iva%' OR nome ILIKE '%imposta%';
  END IF;
END $$;

-- Aggiorna TFR esistente se presente (7.41% tipico)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accantonamenti WHERE nome ILIKE '%tfr%' OR nome ILIKE '%trattamento fine rapporto%') THEN
    UPDATE accantonamenti
    SET tipo_versamento = 'percentuale_incasso', percentuale_incasso = 7.41
    WHERE nome ILIKE '%tfr%' OR nome ILIKE '%trattamento fine rapporto%';
  END IF;
END $$;
