import pool from "@/lib/db";
import { cookies } from "next/headers";

const ALLOWED_STATUSI = ["aktivna", "otkazana", "zavrsena"];
const ALLOWED_KOLONE = ["A", "B", "C", "D", "E", "F"];
let schemaReadyPromise = null;

const getAuthenticatedUserId = async () => {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("korisnik_session")?.value;

    if (!sessionToken) {
      return null;
    }

    const result = await pool.query(
      "SELECT korisnik_id FROM korisnik WHERE session_token = $1",
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].korisnik_id;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
};

const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`
        ALTER TABLE rezervacija
        ADD COLUMN IF NOT EXISTS destinacija_id INTEGER,
        ADD COLUMN IF NOT EXISTS let_id INTEGER,
        ADD COLUMN IF NOT EXISTS datum_leta DATE
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS rezervacija_mjesto (
          rezervacija_mjesto_id SERIAL PRIMARY KEY,
          rezervacija_id INTEGER NOT NULL REFERENCES rezervacija(rezervacija_id) ON DELETE CASCADE,
          destinacija_id INTEGER NOT NULL,
          let_id INTEGER NOT NULL,
          datum_leta DATE NOT NULL,
          red INTEGER NOT NULL CHECK (red BETWEEN 1 AND 6),
          kolona VARCHAR(1) NOT NULL CHECK (kolona IN ('A', 'B', 'C', 'D', 'E', 'F')),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS rezervacija_mjesto_uniq_let_sjedalo
        ON rezervacija_mjesto (destinacija_id, let_id, datum_leta, red, kolona)
      `);
    })();
  }

  return schemaReadyPromise;
};

const formatLocalDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getTodayDateLocal = () => {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

const isPastDate = (datum) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return false;
  }

  return datum < getTodayDateLocal();
};

const resolveStatusZaSpremanje = (status, datumLeta) => {
  const normalizedStatus = String(status || "").trim();

  if (normalizedStatus === "otkazana" || normalizedStatus === "zavrsena") {
    return normalizedStatus;
  }

  if (isPastDate(datumLeta)) {
    return "zavrsena";
  }

  return normalizedStatus || "aktivna";
};

const normalizeMjesta = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((mjesto) => {
      const red = Number(mjesto?.red);
      const kolona = String(mjesto?.kolona || "")
        .trim()
        .toUpperCase();

      return { red, kolona, id: `${red}${kolona}` };
    })
    .filter((mjesto) => Number.isInteger(mjesto.red) && mjesto.red > 0 && mjesto.kolona);
};

export async function GET(request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "occupied") {
      const destinacijaId = Number(searchParams.get("destinacija_id"));
      const letId = Number(searchParams.get("let_id"));
      const datumLeta = String(searchParams.get("datum_leta") || "").trim();

      if (!Number.isInteger(destinacijaId) || destinacijaId <= 0) {
        return new Response(JSON.stringify({ error: "Neispravan destinacija_id" }), { status: 400 });
      }

      if (!Number.isInteger(letId) || letId <= 0) {
        return new Response(JSON.stringify({ error: "Neispravan let_id" }), { status: 400 });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(datumLeta)) {
        return new Response(JSON.stringify({ error: "Neispravan datum_leta" }), { status: 400 });
      }

      const occupied = await pool.query(
        `
        SELECT red, kolona
        FROM rezervacija_mjesto
        WHERE destinacija_id = $1 AND let_id = $2 AND datum_leta = $3
        ORDER BY red, kolona
        `,
        [destinacijaId, letId, datumLeta]
      );

      return new Response(
        JSON.stringify(
          occupied.rows.map((row) => ({
            red: row.red,
            kolona: row.kolona,
            id: `${row.red}${row.kolona}`,
          }))
        ),
        { status: 200 }
      );
    }

    const authenticatedKorisnikId = await getAuthenticatedUserId();
    if (!authenticatedKorisnikId) {
      return new Response(JSON.stringify({ error: "Niste prijavljeni. Molimo prijavite se." }), {
        status: 401,
      });
    }

    await pool.query(
      `
      UPDATE rezervacija
      SET status = 'zavrsena'
      WHERE korisnik_id = $1
        AND status = 'aktivna'
        AND datum_leta < CURRENT_DATE
      `,
      [authenticatedKorisnikId]
    );

    const result = await pool.query(
      `
      SELECT
        r.*,
        COALESCE(
          json_agg(
            json_build_object('red', rm.red, 'kolona', rm.kolona)
            ORDER BY rm.red, rm.kolona
          ) FILTER (WHERE rm.rezervacija_mjesto_id IS NOT NULL),
          '[]'::json
        ) AS mjesta
      FROM rezervacija r
      LEFT JOIN rezervacija_mjesto rm ON rm.rezervacija_id = r.rezervacija_id
      WHERE r.korisnik_id = $1
      GROUP BY r.rezervacija_id
      ORDER BY r.rezervacija_id
    `,
      [authenticatedKorisnikId]
    );

    return new Response(JSON.stringify(result.rows), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function POST(request) {
  try {
    await ensureSchema();

    // Get authenticated user from session
    const authenticatedKorisnikId = await getAuthenticatedUserId();
    if (!authenticatedKorisnikId) {
      return new Response(JSON.stringify({ error: "Niste prijavljeni. Molimo prijavite se." }), {
        status: 401,
      });
    }

    const body = await request.json();
    const korisnikId = authenticatedKorisnikId; // Use authenticated user ID, not from body
    const destinacijaId = Number(body.destinacija_id);
    const letId = Number(body.let_id);
    const ukupnaCijena = Number(body.ukupna_cijena);
    const status = body.status == null ? "" : String(body.status).trim();
    const datumRezervacijeString = body.datum_rezervacije == null ? "" : String(body.datum_rezervacije).trim();
    const datumRezervacije = datumRezervacijeString ? new Date(datumRezervacijeString) : new Date();
    const datumZaSpremanje = datumRezervacijeString || formatLocalDateTime(datumRezervacije);
    const datumLeta = body.datum_leta == null ? getTodayDateLocal() : String(body.datum_leta).trim();
    const mjestaInput =
      Array.isArray(body.mjesta) && body.mjesta.length > 0
        ? body.mjesta
        : body.red != null && body.kolona != null
          ? [{ red: body.red, kolona: body.kolona }]
          : [];
    const mjesta = normalizeMjesta(mjestaInput);

    if (!Number.isInteger(korisnikId) || korisnikId <= 0) {
      return new Response(JSON.stringify({ error: "Neispravan korisnik_id" }), {
        status: 400,
      });
    }

    if (!Number.isInteger(destinacijaId) || destinacijaId <= 0) {
      return new Response(JSON.stringify({ error: "Neispravan destinacija_id" }), {
        status: 400,
      });
    }

    if (!Number.isInteger(letId) || letId <= 0) {
      return new Response(JSON.stringify({ error: "Neispravan let_id" }), {
        status: 400,
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datumLeta)) {
      return new Response(JSON.stringify({ error: "Neispravan datum_leta" }), {
        status: 400,
      });
    }

    if (!Number.isFinite(ukupnaCijena) || ukupnaCijena < 0) {
      return new Response(JSON.stringify({ error: "Neispravna ukupna_cijena" }), {
        status: 400,
      });
    }

    if (Number.isNaN(datumRezervacije.getTime())) {
      return new Response(JSON.stringify({ error: "Neispravan datum_rezervacije" }), {
        status: 400,
      });
    }

    const statusZaSpremanje = resolveStatusZaSpremanje(status, datumLeta);

    if (status && !ALLOWED_STATUSI.includes(status)) {
      return new Response(
        JSON.stringify({
          error: "Neispravan status. Dozvoljeno: aktivna, otkazana, zavrsena.",
        }),
        { status: 400 }
      );
    }

    if (mjesta.length === 0) {
      return new Response(JSON.stringify({ error: "Morate odabrati barem jedno mjesto." }), {
        status: 400,
      });
    }

    const mjestaSet = new Set();
    for (const mjesto of mjesta) {
      if (!Number.isInteger(mjesto.red) || mjesto.red < 1 || mjesto.red > 6) {
        return new Response(JSON.stringify({ error: "Neispravan red mjesta (1-6)." }), {
          status: 400,
        });
      }

      if (!ALLOWED_KOLONE.includes(mjesto.kolona)) {
        return new Response(JSON.stringify({ error: "Neispravna kolona mjesta (A-F)." }), {
          status: 400,
        });
      }

      if (mjestaSet.has(mjesto.id)) {
        return new Response(JSON.stringify({ error: "Isto mjesto je poslano vise puta." }), {
          status: 400,
        });
      }

      mjestaSet.add(mjesto.id);
    }

    const korisnikPostoji = await pool.query(
      `SELECT 1 FROM korisnik WHERE korisnik_id = $1 LIMIT 1`,
      [korisnikId]
    );

    if (korisnikPostoji.rowCount === 0) {
      return new Response(
        JSON.stringify({
          error: `Korisnik sa ID ${korisnikId} ne postoji.`,
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const conflictConditions = mjesta
        .map((_, index) => {
          const start = 4 + index * 2;
          return `(red = $${start} AND kolona = $${start + 1})`;
        })
        .join(" OR ");

      const conflictParams = [destinacijaId, letId, datumLeta];
      mjesta.forEach((mjesto) => {
        conflictParams.push(mjesto.red, mjesto.kolona);
      });

      const konflikt = await client.query(
        `
        SELECT red, kolona
        FROM rezervacija_mjesto
        WHERE destinacija_id = $1
          AND let_id = $2
          AND datum_leta = $3
          AND (${conflictConditions})
        ORDER BY red, kolona
        `,
        conflictParams
      );

      if (konflikt.rowCount > 0) {
        await client.query("ROLLBACK");
        return new Response(
          JSON.stringify({
            error: "Neka od odabranih mjesta su vec zauzeta.",
            zauzeta_mjesta: konflikt.rows.map((row) => `${row.red}${row.kolona}`),
          }),
          { status: 409 }
        );
      }

      const rezervacijaResult = await client.query(
        `
        INSERT INTO rezervacija (
          korisnik_id,
          destinacija_id,
          let_id,
          datum_leta,
          datum_rezervacije,
          ukupna_cijena,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [korisnikId, destinacijaId, letId, datumLeta, datumZaSpremanje, ukupnaCijena, statusZaSpremanje]
      );

      const rezervacijaId = rezervacijaResult.rows[0].rezervacija_id;
      const mjestaValues = mjesta
        .map((_, index) => {
          const start = index * 6;
          return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6})`;
        })
        .join(", ");

      const mjestaParams = [];
      mjesta.forEach((mjesto) => {
        mjestaParams.push(rezervacijaId, destinacijaId, letId, datumLeta, mjesto.red, mjesto.kolona);
      });

      await client.query(
        `
        INSERT INTO rezervacija_mjesto (
          rezervacija_id,
          destinacija_id,
          let_id,
          datum_leta,
          red,
          kolona
        )
        VALUES ${mjestaValues}
        `,
        mjestaParams
      );

      await client.query("COMMIT");

      return new Response(
        JSON.stringify({
          ...rezervacijaResult.rows[0],
          mjesta: mjesta.map((mjesto) => ({ red: mjesto.red, kolona: mjesto.kolona })),
        }),
        { status: 201 }
      );
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);

    if (err && err.code === "23505") {
      return new Response(
        JSON.stringify({
          error: "Neka od odabranih mjesta su vec zauzeta.",
        }),
        { status: 409 }
      );
    }

    if (err && err.code === "23514" && err.constraint === "check_status") {
      return new Response(
        JSON.stringify({
          error: "Neispravan status. Dozvoljeno: aktivna, otkazana, zavrsena.",
        }),
        { status: 400 }
      );
    }

    if (err && err.code === "23503") {
      return new Response(
        JSON.stringify({
          error: "Neispravan korisnik_id. Taj korisnik ne postoji u tabeli korisnik.",
        }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function DELETE() {
  try {
    await ensureSchema();

    // Get authenticated user from session
    const authenticatedKorisnikId = await getAuthenticatedUserId();
    if (!authenticatedKorisnikId) {
      return new Response(JSON.stringify({ error: "Niste prijavljeni. Molimo prijavite se." }), {
        status: 401,
      });
    }

    const adminCheck = await pool.query(
      "SELECT is_admin FROM korisnik WHERE korisnik_id = $1 LIMIT 1",
      [authenticatedKorisnikId]
    );

    const isAdmin = adminCheck.rowCount > 0 && Boolean(adminCheck.rows[0].is_admin);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Samo admin može obrisati sve rezervacije." }),
        { status: 403 }
      );
    }

    await pool.query(`DELETE FROM rezervacija`);

    return new Response(
      JSON.stringify({ message: "Sve rezervacije su obrisane." }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}