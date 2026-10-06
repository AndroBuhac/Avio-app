BEGIN;

-- Prije pokretanja ovog dijela, provjeri koje su oznake sjedala neispravne.
-- Ovaj SELECT vraća redove iz karta koje ne možemo sigurno mapirati u format red + kolona.
SELECT k.karta_id, k.rezervacija_id, k.let_id, k.broj_sjedala
FROM karta k
WHERE k.broj_sjedala IS NOT NULL
  AND BTRIM(k.broj_sjedala) <> ''
  AND BTRIM(k.broj_sjedala) !~ '^[0-9]+[A-F]$';

-- Kopiranje sjedala iz karta u rezervacija_mjesto.
-- Očekivani format je npr. 12A, gdje je 12 red, a A kolona.
INSERT INTO rezervacija_mjesto (
  rezervacija_id,
  destinacija_id,
  let_id,
  datum_leta,
  red,
  kolona,
  created_at
)
SELECT
  k.rezervacija_id,
  r.destinacija_id,
  k.let_id,
  COALESCE(r.datum_leta, CURRENT_DATE),
  CAST(regexp_replace(BTRIM(k.broj_sjedala), '[^0-9]', '', 'g') AS INTEGER) AS red,
  UPPER(regexp_replace(BTRIM(k.broj_sjedala), '^[0-9]+', '')) AS kolona,
  NOW()
FROM karta k
JOIN rezervacija r ON r.rezervacija_id = k.rezervacija_id
WHERE k.broj_sjedala IS NOT NULL
  AND BTRIM(k.broj_sjedala) ~ '^[0-9]+[A-F]$'
  AND NOT EXISTS (
    SELECT 1
    FROM rezervacija_mjesto rm
    WHERE rm.rezervacija_id = k.rezervacija_id
      AND rm.let_id = k.let_id
      AND rm.red = CAST(regexp_replace(BTRIM(k.broj_sjedala), '[^0-9]', '', 'g') AS INTEGER)
      AND rm.kolona = UPPER(regexp_replace(BTRIM(k.broj_sjedala), '^[0-9]+', ''))
  );

COMMIT;

-- Nakon što potvrdiš da su podaci prebačeni, možeš pokrenuti:
-- ALTER TABLE karta DROP COLUMN IF EXISTS broj_sjedala;
