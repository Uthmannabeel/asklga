import { sql } from "drizzle-orm";

/**
 * Register numbers look like OBA-P-0013: LGA code, record kind, running number.
 * The LGA code is taken from any existing record for that LGA (so seeded codes are kept),
 * otherwise from the first three letters of the LGA slug.
 */
export function defaultCode(lgaId: string): string {
  const letters = lgaId.replace(/[^a-z]/gi, "").toUpperCase();
  return (letters.slice(0, 3) || "LGA").padEnd(3, "X");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function lgaCodeFor(db: any, lgaId: string): Promise<string> {
  for (const table of ["projects", "services", "assets", "documents", "profile_sections", "issues"]) {
    const res = await db.execute(sql.raw(`SELECT id FROM ${table} WHERE lga_id = '${lgaId.replace(/'/g, "''")}' LIMIT 1`));
    const rows = (res.rows ?? res) as { id: string }[];
    const m = rows[0]?.id?.match(/^([A-Z0-9]{2,5})-/);
    if (m) return m[1];
  }
  return defaultCode(lgaId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function nextId(db: any, table: string, lgaId: string, kind: "P" | "S" | "A" | "D" | "R"): Promise<string> {
  const prefix = `${await lgaCodeFor(db, lgaId)}-${kind}-`;
  const res = await db.execute(
    sql.raw(`SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM ${prefix.length + 1}) AS integer)), 0) AS n FROM ${table} WHERE id LIKE '${prefix}%' AND SUBSTRING(id FROM ${prefix.length + 1}) ~ '^[0-9]+$'`),
  );
  const rows = (res.rows ?? res) as { n: number | string }[];
  const n = Number(rows[0]?.n ?? 0) + 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}
