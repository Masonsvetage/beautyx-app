-- Aggiungi campo icona a custom_categories
ALTER TABLE custom_categories
ADD COLUMN IF NOT EXISTS icona VARCHAR(10) DEFAULT '📁';

-- Aggiorna le categorie di default con icone appropriate
UPDATE custom_categories
SET icona = CASE
  WHEN nome = 'Dipendenti' THEN '👥'
  WHEN nome = 'Professionisti' THEN '💼'
  WHEN nome = 'Fornitori' THEN '🏪'
  WHEN nome = 'Prodotti/Servizi' THEN '📦'
  WHEN nome = 'Marketing' THEN '📢'
  WHEN nome = 'Affitto' THEN '🏠'
  WHEN nome = 'Utenze' THEN '💡'
  WHEN nome = 'Assicurazioni' THEN '🛡️'
  WHEN nome = 'Tasse' THEN '🏛️'
  WHEN nome = 'Manutenzione' THEN '🔧'
  WHEN nome = 'USCITE VARIE' THEN '📋'
  ELSE '📁'
END
WHERE centro_id = '1a72344b-aac1-465b-92d4-7e670f430340';
