import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ADMIN_EMAIL = "andro.buhac@gmail.com";

// Schema bootstrap for korisnik table (add auth fields)
let schemaPromise = null;

export async function ensureAuthSchema() {
  if (schemaPromise) return schemaPromise;
  
  schemaPromise = (async () => {
    try {
      await pool.query(`
        ALTER TABLE korisnik
        ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
        ADD COLUMN IF NOT EXISTS ime VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS session_token VARCHAR(255)
      `);
      
          // Allow NULL for prezime to accommodate auth-only users
          await pool.query(`
            ALTER TABLE korisnik
            ALTER COLUMN prezime DROP NOT NULL
          `).catch(() => {});

      await pool.query(
        "UPDATE korisnik SET is_admin = TRUE WHERE LOWER(email) = LOWER($1)",
        [ADMIN_EMAIL]
      );
    } catch (error) {
      console.error("Schema bootstrap error:", error);
      schemaPromise = null;
      throw error;
    }
  })();
  
  return schemaPromise;
}

export default pool;