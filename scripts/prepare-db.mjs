import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(projectRoot, "database", "migrations", "000_prepare_application_schema.sql");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nije postavljen.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const migration = await readFile(migrationPath, "utf8");
  await pool.query(migration);

  if (process.env.ADMIN_EMAIL) {
    await pool.query(
      "UPDATE korisnik SET is_admin = TRUE WHERE LOWER(email) = LOWER($1)",
      [process.env.ADMIN_EMAIL.trim()]
    );
  }

  console.log("Osnovna shema aplikacije je pripremljena.");
} finally {
  await pool.end();
}