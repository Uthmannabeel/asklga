import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

/**
 * FAAC allocation queries. Figures are shown exactly as published; the only arithmetic here is
 * sums, ranks and month-on-month change, and each page says so.
 */

const amount = sql<number>`coalesce(${s.allocations.netNgn}, ${s.allocations.grossNgn})`;

export type LedgerRow = { period: string; grossNgn: number | null; deductionsNgn: number | null; netNgn: number | null; value: number | null; change: number | null; source: string; sourceUrl: string | null };

/** Every month on file for one LGA, oldest first, with change against the previous month. */
export async function ledger(lgaId: string): Promise<LedgerRow[]> {
  const db = await getDb();
  const rows = await db.select().from(s.allocations).where(eq(s.allocations.lgaId, lgaId)).orderBy(asc(s.allocations.period));
  let prev: number | null = null;
  return rows.map((r) => {
    const value = r.netNgn ?? r.grossNgn ?? null;
    const change = value != null && prev ? (value - prev) / prev : null;
    prev = value;
    return { period: r.period, grossNgn: r.grossNgn, deductionsNgn: r.deductionsNgn ?? null, netNgn: r.netNgn, value, change, source: r.source, sourceUrl: r.sourceUrl };
  });
}

/** Where an LGA stands for one month: rank in its state and nationally (1 = highest). */
export async function rankFor(lgaId: string, state: string, period: string) {
  const db = await getDb();
  const rows = await db
    .select({ lgaId: s.allocations.lgaId, state: s.lgas.state, v: amount })
    .from(s.allocations)
    .innerJoin(s.lgas, eq(s.lgas.id, s.allocations.lgaId))
    .where(eq(s.allocations.period, period));
  const nat = [...rows].sort((a, b) => Number(b.v) - Number(a.v));
  const st = nat.filter((r) => r.state === state);
  return {
    national: nat.findIndex((r) => r.lgaId === lgaId) + 1,
    nationalOf: nat.length,
    state: st.findIndex((r) => r.lgaId === lgaId) + 1,
    stateOf: st.length,
    stateMedian: st.length ? Number(st[Math.floor(st.length / 2)].v) : null,
  };
}

export async function periods(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.selectDistinct({ p: s.allocations.period }).from(s.allocations).orderBy(desc(s.allocations.period));
  return rows.map((r) => r.p);
}

export type MonthRow = { id: string; name: string; state: string; population: number | null; grossNgn: number | null; netNgn: number | null; value: number; perHead: number | null };

/** Every LGA's allocation for one month, highest first. */
export async function month(period: string): Promise<MonthRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: s.lgas.id, name: s.lgas.name, state: s.lgas.state, population: s.lgas.population, grossNgn: s.allocations.grossNgn, netNgn: s.allocations.netNgn })
    .from(s.allocations)
    .innerJoin(s.lgas, eq(s.lgas.id, s.allocations.lgaId))
    .where(eq(s.allocations.period, period));
  return rows
    .map((r) => {
      const value = Number(r.netNgn ?? r.grossNgn ?? 0);
      return { ...r, grossNgn: r.grossNgn == null ? null : Number(r.grossNgn), netNgn: r.netNgn == null ? null : Number(r.netNgn), value, perHead: r.population ? value / r.population : null };
    })
    .sort((a, b) => b.value - a.value);
}

/** National monthly totals, oldest first, for the national chart. */
export async function nationalSeries(limit = 24) {
  const db = await getDb();
  const rows = await db
    .select({ period: s.allocations.period, total: sql<number>`sum(${amount})`, lgas: sql<number>`count(*)` })
    .from(s.allocations)
    .groupBy(s.allocations.period)
    .orderBy(desc(s.allocations.period))
    .limit(limit);
  return rows.reverse().map((r) => ({ period: r.period, total: Number(r.total), lgas: Number(r.lgas) }));
}

/** Sum of every month on file for one LGA, with the span it covers. */
export async function totalOnFile(lgaId: string) {
  const db = await getDb();
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${amount}), 0)`, months: sql<number>`count(*)`, first: sql<string | null>`min(${s.allocations.period})`, last: sql<string | null>`max(${s.allocations.period})` })
    .from(s.allocations)
    .where(and(eq(s.allocations.lgaId, lgaId)));
  return { total: Number(r?.total ?? 0), months: Number(r?.months ?? 0), first: r?.first ?? null, last: r?.last ?? null };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-03" -> "Mar 26" (chart) or "March 2026" (text). */
export function periodLabel(p: string, long = false) {
  const [y, m] = p.split("-").map(Number);
  if (!y || !m) return p;
  return long ? `${LONG[m - 1]} ${y}` : `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** ₦ with thousands separators and no kobo: ₦465,548,215. */
export function naira(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "Not published";
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

/** ₦465.5M / ₦39.7B, for headlines. Exact figures sit in the tables. */
export function nairaShort(n: number | null | undefined) {
  if (n == null) return "Not published";
  if (n >= 1e12) return `₦${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `₦${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`;
  return naira(n);
}
