import { NextResponse } from "next/server";
import pool, { ensureAuthSchema } from "@/lib/db";
import { hashPassword, validateEmail, validatePassword, generateSessionToken } from "@/lib/auth";

const ADMIN_EMAIL = "andro.buhac@gmail.com";

export async function POST(request) {
  try {
    // Bootstrap schema on first request
    await ensureAuthSchema();

    const { email, password, ime } = await request.json();

    // Validation
    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!password || !validatePassword(password)) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (!ime || ime.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await pool.query("SELECT korisnik_id FROM korisnik WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL;

    // Insert new user. Keep compatibility with legacy schema that still requires lozinka.
    const result = await pool.query(
      "INSERT INTO korisnik (email, password_hash, lozinka, ime, is_admin, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING korisnik_id, email, ime, is_admin",
      [email, passwordHash, passwordHash, ime.trim(), isAdmin]
    );

    const user = result.rows[0];

    // Generate session token and store in database
    const sessionToken = generateSessionToken();
    await pool.query(
      "UPDATE korisnik SET session_token = $1 WHERE korisnik_id = $2",
      [sessionToken, user.korisnik_id]
    );
    const response = NextResponse.json(
      { korisnik_id: user.korisnik_id, email: user.email, ime: user.ime, is_admin: user.is_admin },
      { status: 201 }
    );
    response.cookies.set("korisnik_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
