import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";
import { seedDirectory } from "./directory";
import { seedProfiles } from "./profiles";

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
    const dataDir = path.join(process.cwd(), "data", "pglite");
    fs.mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    db = drizzle(client, { schema }) as unknown as Db;
  }

  // Migrations are plain SQL files applied in name order on every start; each is idempotent
  // (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS). next.config.ts lists the folder in
  // outputFileTracingIncludes so a standalone/serverless build still ships it.
  const dir = path.join(process.cwd(), "src", "db", "migrations");
  if (!fs.existsSync(dir)) {
    throw new Error(`Database migrations not found at ${dir}. Deploy the src/db/migrations folder with the app.`);
  }
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const migration = fs.readFileSync(path.join(dir, file), "utf8");
    for (const statement of migration.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      await db.execute(sql.raw(statement));
    }
  }

  // Demo records are seeded only into the embedded local database unless AUTO_SEED=true is set
  // explicitly, so a real deployment with DATABASE_URL never starts with fictional records.
  const autoSeed = process.env.AUTO_SEED ?? (process.env.DATABASE_URL ? "false" : "true");
  if (autoSeed === "true") {
    await seedIfEmpty(db);
  }
  // The national directory is not demo data: every LGA in the country gets a row.
  const added = await seedDirectory(db);
  if (added) console.log(`[db] national directory: added ${added} LGAs`);
  const filled = await seedProfiles(db);
  if (filled) console.log(`[db] profile facts filled for ${filled} LGAs`);
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__asklgaDb) {
    // If bootstrap fails (database briefly unreachable, seed error), forget the rejected
    // promise so the next request retries instead of failing for the life of the process.
    globalForDb.__asklgaDb = create().catch((e) => {
      delete globalForDb.__asklgaDb;
      throw e;
    });
  }
  return globalForDb.__asklgaDb;
}

export { schema };
