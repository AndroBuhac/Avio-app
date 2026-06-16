import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("korisnik_session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify token exists in database and get user
    const result = await pool.query(
      "SELECT korisnik_id, email, ime, is_admin FROM korisnik WHERE session_token = $1",
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = result.rows[0];
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Me endpoint error:", error);
    return NextResponse.json({ error: "Failed to get user info" }, { status: 500 });
  }
}
