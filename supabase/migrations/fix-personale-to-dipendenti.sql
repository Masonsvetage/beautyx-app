-- Aggiorna tutti i movimenti con categoria "personale" in "Dipendenti"
UPDATE bank_movements
SET categoria = 'Dipendenti'
WHERE categoria = 'personale'
  OR categoria = 'Personale';

-- Mostra quanti record sono stati aggiornati
SELECT
  'Movimenti aggiornati da personale a Dipendenti' as messaggio,
  COUNT(*) as totale
FROM bank_movements
WHERE categoria = 'Dipendenti';
