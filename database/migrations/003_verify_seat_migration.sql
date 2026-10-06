-- Kontrolna provjera nakon migracije sjedala iz karta u rezervacija_mjesto

-- 1) Koliko redova još ima seat podatak u karta
SELECT COUNT(*) AS karta_sa_broj_sjedala
FROM karta
WHERE broj_sjedala IS NOT NULL
  AND BTRIM(broj_sjedala) <> '';

-- 2) Koliko seat redova postoji u rezervacija_mjesto
SELECT COUNT(*) AS rezervacija_mjesto_redova
FROM rezervacija_mjesto;

-- 3) Redovi u karta koje nije moguće mapirati iz formata npr. 12A
SELECT karta_id, rezervacija_id, let_id, broj_sjedala
FROM karta
WHERE broj_sjedala IS NOT NULL
  AND BTRIM(broj_sjedala) <> ''
  AND BTRIM(broj_sjedala) !~ '^[0-9]+[A-F]$';

-- 4) Redovi iz karta koji se još nisu preselili u rezervacija_mjesto
SELECT k.karta_id, k.rezervacija_id, k.let_id, k.broj_sjedala
FROM karta k
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

-- 5) Potvrda da nema duplikata sjedala u rezervacija_mjesto za isti let i datum
SELECT destinacija_id, let_id, datum_leta, red, kolona, COUNT(*) AS broj_puta
FROM rezervacija_mjesto
GROUP BY destinacija_id, let_id, datum_leta, red, kolona
HAVING COUNT(*) > 1
ORDER BY broj_puta DESC, destinacija_id, let_id, datum_leta, red, kolona;
