-- Aggiungi supporto per chiusure ricorrenti
ALTER TABLE exceptional_closures
ADD COLUMN ricorrente BOOLEAN DEFAULT false,
ADD COLUMN tipo_ricorrenza VARCHAR(10) CHECK (tipo_ricorrenza IN ('annuale', 'mensile', null));

-- Commenti per documentazione
COMMENT ON COLUMN exceptional_closures.ricorrente IS 'Se true, la chiusura si ripete ogni anno/mese';
COMMENT ON COLUMN exceptional_closures.tipo_ricorrenza IS 'annuale = ogni anno alla stessa data (es. 15 agosto), mensile = ogni mese alla stessa data (es. primo lunedì del mese)';
