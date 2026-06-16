import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyPassword, generateSessionToken, hashPassword } from "@/lib/auth";

const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find user by email
    const result = await pool.query(
      "SELECT korisnik_id, email, ime, is_admin, password_hash, lozinka FROM korisnik WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = result.rows[0];

    // Verify password
    const storedValue = user.password_hash || user.lozinka;
    if (!storedValue) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    let passwordMatch = false;

    if (isBcryptHash(storedValue)) {
      passwordMatch = await verifyPassword(password, storedValue);
    } else {
      // Legacy support: old records may still have plaintext password in lozinka.
      passwordMatch = password === String(storedValue);

      if (passwordMatch) {
        const newHash = await hashPassword(password);
        await pool.query(
          "UPDATE korisnik SET password_hash = $1, lozinka = $1 WHERE korisnik_id = $2",
          [newHash, user.korisnik_id]
        );
      }
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Generate session token and store in database
    const sessionToken = generateSessionToken();
    await pool.query(
      "UPDATE korisnik SET session_token = $1 WHERE korisnik_id = $2",
      [sessionToken, user.korisnik_id]
    );
    const response = NextResponse.json(
      { korisnik_id: user.korisnik_id, email: user.email, ime: user.ime, is_admin: user.is_admin },
      { status: 200 }
    );
    response.cookies.set("korisnik_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
