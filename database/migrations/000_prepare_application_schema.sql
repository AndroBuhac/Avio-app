BEGIN;

ALTER TABLE korisnik
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ime VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);

ALTER TABLE korisnik
  ALTER COLUMN prezime DROP NOT NULL;

ALTER TABLE rezervacija
  ADD COLUMN IF NOT EXISTS destinacija_id INTEGER,
  ADD COLUMN IF NOT EXISTS let_id INTEGER,
  ADD COLUMN IF NOT EXISTS datum_leta DATE;

CREATE TABLE IF NOT EXISTS rezervacija_mjesto (
  rezervacija_mjesto_id SERIAL PRIMARY KEY,
  rezervacija_id INTEGER NOT NULL REFERENCES rezervacija(rezervacija_id) ON DELETE CASCADE,
  destinacija_id INTEGER NOT NULL,
  let_id INTEGER NOT NULL,
  datum_leta DATE NOT NULL,
  red INTEGER NOT NULL CHECK (red BETWEEN 1 AND 6),
  kolona VARCHAR(1) NOT NULL CHECK (kolona IN ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS rezervacija_mjesto_uniq_let_sjedalo
  ON rezervacija_mjesto (destinacija_id, let_id, datum_leta, red, kolona);

COMMIT;