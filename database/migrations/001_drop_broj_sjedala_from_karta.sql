BEGIN;

-- Seat data is normalized in rezervacija_mjesto.
-- karta should keep only reservation/ticket data and no longer duplicate the seat label.
ALTER TABLE karta
DROP COLUMN IF EXISTS broj_sjedala;

COMMIT;