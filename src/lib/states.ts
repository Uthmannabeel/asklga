import { and, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { directory } from "./national";

export type StateLgaRow = {
  id: string;
  name: string;
  headquarters: string | null;
  population: number | null;
  populationYear: number | null;
  areaKm2: number | null;
  records: number;
  latest: number | null;
  latestPeriod: string | null;
  perHead: number | null;
};

/** Every LGA in a state with its profile facts and its allocation in the latest month on file. */
export async function stateLgas(state: string) {
  const db = await getDb();
  const [dir, lgas, [lp]] = await Promise.all([
    directory(),
    db.select().from(s.lgas).where(eq(s.lgas.state, state)),
    db.select({ p: sql<string | null>`max(${s.allocations.period})` }).from(s.allocations).innerJoin(s.lgas, eq(s.lgas.id, s.allocations.lgaId)).where(eq(s.lgas.state, state)),
  ]);
  const period = lp?.p ?? null;
  const alloc = new Map<string, number>();
  if (period) {
    const rows = await db
      .select({ id: s.allocations.lgaId, v: sql<number>`coalesce(${s.allocations.netNgn}, ${s.allocations.grossNgn})` })
      .from(s.allocations)
      .innerJoin(s.lgas, eq(s.lgas.id, s.allocations.lgaId))
      .where(and(eq(s.lgas.state, state), eq(s.allocations.period, period)));
    for (const r of rows) alloc.set(r.id, Number(r.v));
  }
  const records = new Map(dir.map((d) => [d.id, d.records]));
  const rows: StateLgaRow[] = lgas.map((l) => {
    const latest = alloc.get(l.id) ?? null;
    return {
      id: l.id,
      name: l.name,
      headquarters: l.headquarters,
      population: l.population,
      populationYear: l.populationYear,
      areaKm2: l.areaKm2,
      records: records.get(l.id) ?? 0,
      latest,
      latestPeriod: latest != null ? period : null,
      perHead: latest != null && l.population ? latest / l.population : null,
    };
  });
  return { rows, period };
}

/** Monthly totals for one state, oldest first. */
export async function stateSeries(state: string, limit = 24) {
  const db = await getDb();
  const rows = await db
    .select({ period: s.allocations.period, total: sql<number>`sum(coalesce(${s.allocations.netNgn}, ${s.allocations.grossNgn}))` })
    .from(s.allocations)
    .innerJoin(s.lgas, eq(s.lgas.id, s.allocations.lgaId))
    .where(eq(s.lgas.state, state))
    .groupBy(s.allocations.period)
    .orderBy(sql`${s.allocations.period} desc`)
    .limit(limit);
  return rows.reverse().map((r) => ({ period: r.period, total: Number(r.total) }));
}
