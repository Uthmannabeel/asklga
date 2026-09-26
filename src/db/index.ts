import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

/**
 * One database module, two drivers.
 *  - DATABASE_URL set  -> Postgres via node-postgres (production: a Nigerian-hosted Postgres).
 *  - DATABASE_URL unset -> PGlite, an embedded Postgres, stored under ./data/pglite (local dev, demos).
 * Both run the same SQL migration and expose the same Drizzle API.
 */

/** Common Drizzle type shared by the PGlite and node-postgres drivers. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __asklgaDb?: Promise<Db> };

async function create(): Promise<Db> {
  let db: Db;
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema }) as unknown as Db;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dir = path.join(process.cwd(), "data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    db = drizzle(client, { schema }) as unknown as Db;
  }

  const migration = fs.readFileSync(
    path.join(process.cwd(), "src", "db", "migrations", "0000_init.sql"),
    "utf8",
  );
  for (const statement of migration.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    await db.execute(sql.raw(statement));
  }

  if (process.env.AUTO_SEED !== "false") {
    await seedIfEmpty(db);
  }
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__asklgaDb) {
    globalForDb.__asklgaDb = create();
  }
  return globalForDb.__asklgaDb;
}

export { schema };
