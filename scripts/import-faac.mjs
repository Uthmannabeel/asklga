#!/usr/bin/env node
/**
 * Import published FAAC allocations into the allocations table.
 *
 *   node scripts/import-faac.mjs path/to/faac.json [--dry-run]
 *
 * Input: a JSON array of {id, period:"YYYY-MM", grossNgn?, deductionsNgn?, netNgn?, source, sourceUrl?}
 * where id is the LGA slug from src/db/lgas.json. Uses DATABASE_URL when set (Postgres),
 * otherwise the local embedded database in ./data/pglite. Existing (lga, month) rows are kept:
 * this never overwrites a figure already on file.
 */
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const dry = process.argv.includes("--dry-run");
if (!file) {
  console.error("Usage: node scripts/import-faac.mjs faac.json [--dry-run]");
  process.exit(1);
}
const rows = JSON.parse(fs.readFileSync(file, "utf8"));
const lgas = new Set(JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/db/lgas.json"), "utf8")).map((l) => l.id));

const bad = [];
const good = [];
for (const r of rows) {
  const int = (v) => (v == null || v === "" ? null : Math.round(Number(v)));
  const row = { lga_id: r.id, period: r.period, gross_ngn: int(r.grossNgn), deductions_ngn: int(r.deductionsNgn), net_ngn: int(r.netNgn), source: r.source, source_url: r.sourceUrl ?? r.source_url ?? null };
  const why = !lgas.has(row.lga_id) ? "unknown LGA id" : !/^\d{4}-\d{2}$/.test(row.period ?? "") ? "bad period" : !row.source ? "missing source" : row.gross_ngn == null && row.net_ngn == null ? "no figure" : [row.gross_ngn, row.net_ngn, row.deductions_ngn].some((v) => v != null && (!Number.isFinite(v) || v < 0)) ? "bad figure" : null;
  if (why) bad.push({ ...r, why });
  else good.push(row);
}
console.log(`rows: ${rows.length}, valid: ${good.length}, rejected: ${bad.length}`);
if (bad.length) console.log("first rejections:", bad.slice(0, 10));
if (dry) process.exit(0);

let exec;
let close = async () => {};
if (process.env.DATABASE_URL) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  exec = (sql, params) => pool.query(sql, params);
  close = () => pool.end();
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(path.join(process.cwd(), "data", "pglite"));
  exec = (sql, params) => db.query(sql, params);
  close = () => db.close();
}

// The deductions column arrives with migration 0003; make sure it exists before inserting.
await exec("ALTER TABLE allocations ADD COLUMN IF NOT EXISTS deductions_ngn bigint");

let inserted = 0;
const BATCH = 500;
for (let i = 0; i < good.length; i += BATCH) {
  const chunk = good.slice(i, i + BATCH);
  const params = [];
  const values = chunk.map((r, j) => {
    params.push(r.lga_id, r.period, r.gross_ngn, r.deductions_ngn, r.net_ngn, r.source, r.source_url);
    const b = j * 7;
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`;
  });
  const res = await exec(
    `INSERT INTO allocations (lga_id, period, gross_ngn, deductions_ngn, net_ngn, source, source_url) VALUES ${values.join(",")} ON CONFLICT (lga_id, period) DO NOTHING`,
    params,
  );
  inserted += res.rowCount ?? res.affectedRows ?? 0;
  process.stdout.write(`\r${Math.min(i + BATCH, good.length)}/${good.length}`);
}
console.log(`\ninserted ${inserted} new rows; ${good.length - inserted} already on file`);
await close();
