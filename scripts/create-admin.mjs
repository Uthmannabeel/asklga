/**
 * Creates (or resets the password of) a staff account without the browser, e.g. for the first
 * administrator on a fresh server or for a locked-out officer.
 *
 *   node scripts/create-admin.mjs <email> "<name>" <password> [role=admin] [lga=*]
 *
 * Uses DATABASE_URL when set, otherwise the embedded database under ./data/pglite (stop the
 * dev/prod server first: PGlite allows one process at a time). Passwords are scrypt-hashed in
 * the same format as src/lib/auth.ts.
 */
import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";

const [email, name, password, role = "admin", lga = "*"] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> "<name>" <password> [admin|editor|viewer] [lga-id|*]');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error("Invalid email"); process.exit(1); }
if (password.length < 10) { console.error("Password must be at least 10 characters"); process.exit(1); }
if (!["admin", "editor", "viewer"].includes(role)) { console.error("Role must be admin, editor or viewer"); process.exit(1); }

const salt = randomBytes(16).toString("hex");
const hash = `scrypt$16384$${salt}$${scryptSync(password.normalize("NFC"), salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")}`;
const lgaId = lga === "*" ? null : lga;

async function run(query) {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      return await query((text, params) => pool.query(text, params));
    } finally {
      await pool.end();
    }
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite(path.join(process.cwd(), "data", "pglite"));
  try {
    return await query((text, params) => client.query(text, params));
  } finally {
    await client.close();
  }
}

await run(async (q) => {
  const exists = await q("SELECT id FROM staff_users WHERE email = $1", [email.toLowerCase()]);
  if (exists.rows.length) {
    await q("UPDATE staff_users SET password_hash = $1, name = $2, role = $3, lga_id = $4, active = true WHERE email = $5", [hash, name, role, lgaId, email.toLowerCase()]);
    console.log(`Updated ${email}: password reset, role ${role}, LGA ${lga}`);
  } else {
    await q("INSERT INTO staff_users (email, name, role, lga_id, password_hash, active) VALUES ($1, $2, $3, $4, $5, true)", [email.toLowerCase(), name, role, lgaId, hash]);
    console.log(`Created ${email}: role ${role}, LGA ${lga}`);
  }
});
