import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";

const getAdminId = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("korisnik_session")?.value;

  if (!sessionToken) {
    return null;
  }

  const result = await pool.query(
    "SELECT korisnik_id FROM korisnik WHERE session_token = $1 AND is_admin = TRUE LIMIT 1",
    [sessionToken]
  );

  return result.rows[0]?.korisnik_id || null;
};

export async function GET() {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return NextResponse.json({ error: "Samo administrator ima pristup." }, { status: 403 });
    }

    const [usersResult, reservationsResult] = await Promise.all([
      pool.query(`
        SELECT
          k.korisnik_id,
          k.ime,
          k.prezime,
          k.email,
          k.is_admin,
          k.created_at,
          COUNT(r.rezervacija_id)::INTEGER AS broj_rezervacija
        FROM korisnik k
        LEFT JOIN rezervacija r ON r.korisnik_id = k.korisnik_id
        GROUP BY k.korisnik_id
        ORDER BY k.korisnik_id DESC
      `),
      pool.query(`
        SELECT
          r.rezervacija_id,
          r.korisnik_id,
          r.destinacija_id,
          r.let_id,
          r.datum_leta,
          r.datum_rezervacije,
          r.ukupna_cijena,
          r.status,
          k.ime,
          k.prezime,
          k.email,
          COALESCE(
            json_agg(
              json_build_object('red', rm.red, 'kolona', rm.kolona)
              ORDER BY rm.red, rm.kolona
            ) FILTER (WHERE rm.rezervacija_mjesto_id IS NOT NULL),
            '[]'::json
          ) AS mjesta
        FROM rezervacija r
        JOIN korisnik k ON k.korisnik_id = r.korisnik_id
        LEFT JOIN rezervacija_mjesto rm ON rm.rezervacija_id = r.rezervacija_id
        GROUP BY r.rezervacija_id, k.korisnik_id
        ORDER BY r.rezervacija_id DESC
      `),
    ]);

    return NextResponse.json({
      korisnici: usersResult.rows,
      rezervacije: reservationsResult.rows,
    });
  } catch (error) {
    console.error("Admin data error:", error);
    return NextResponse.json({ error: "Nije moguće učitati administratorske podatke." }, { status: 500 });
  }
}
