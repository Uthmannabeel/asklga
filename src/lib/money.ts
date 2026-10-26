import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { memo } from "./memo";

/**
 * FAAC allocation queries. Figures are shown exactly as published; the only arithmetic here is
 * sums, ranks and month-on-month change, and each page says so.
 */

const amount = sql<number>`coalesce(${s.allocations.netNgn}, ${s.allocations.grossNgn})`;

export type LedgerRow = { period: string; revenueMonth: string | null; grossNgn: number | null; deductionsNgn: number | null; netNgn: number | null; value: number | null; change: number | null; lines: Record<string, number> | null; source: string; sourceUrl: string | null };

/** Every month on file for one LGA, oldest first, with change against the previous month. */
export async function ledger(lgaId: string): Promise<LedgerRow[]> {
  const db = await getDb();
  const rows = await db.select().from(s.allocations).where(eq(s.allocations.lgaId, lgaId)).orderBy(asc(s.allocations.period));
  let prev: number | null = null;
  let prevPeriod: string | null = null;
  return rows.map((r) => {
    const value = r.netNgn ?? r.grossNgn ?? null;
    // Only compare with the month immediately before: a gap (an unpublished month) gets no change.
    const change = value != null && prev && prevPeriod === previousMonth(r.period) ? (value - prev) / prev : null;
    prev = value;
    prevPeriod = r.period;
    return { period: r.period, revenueMonth: r.revenueMonth ?? null, grossNgn: r.grossNgn, deductionsNgn: r.deductionsNgn ?? null, netNgn: r.netNgn, value, change, lines: (r.lines as Record<string, number> | null) ?? null, source: r.source, sourceUrl: r.sourceUrl };
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

export function periods(): Promise<string[]> {
  return memo("money:periods", async () => {
    const db = await getDb();
    const rows = await db.selectDistinct({ p: s.allocations.period }).from(s.allocations).orderBy(desc(s.allocations.period));
    return rows.map((r) => r.p);
  });
}

export type MonthRow = { id: string; name: string; state: string; population: number | null; grossNgn: number | null; netNgn: number | null; value: number; perHead: number | null };

/** Every LGA's allocation for one month, highest first. */
export function month(period: string): Promise<MonthRow[]> {
  return memo(`money:month:${period}`, () => readMonth(period));
}

async function readMonth(period: string): Promise<MonthRow[]> {
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

/** Plain names for the published component lines of an allocation, in display order. */
export const LINE_LABELS: [string, string][] = [
  ["statutory", "Statutory allocation"],
  ["vat", "Value Added Tax (VAT)"],
  ["exchangeGain", "Exchange gain"],
  ["augmentation", "Augmentation"],
  ["solidMinerals", "Solid minerals"],
  ["emtl", "Electronic Money Transfer Levy"],
  ["netEcology", "Ecology fund, after transfer to NDDC or HYPPADEC"],
  ["deduction", "Deductions"],
];

/** The components of one allocation as [label, amount] rows, including one-off lines. */
export function lineRows(lines: Record<string, number> | null): [string, number][] {
  if (!lines) return [];
  const out: [string, number][] = [];
  for (const [k, label] of LINE_LABELS) if (lines[k] != null && lines[k] !== 0) out.push([label, lines[k]]);
  for (const [k, v] of Object.entries(lines)) if (k.startsWith("other:") && v) out.push([k.slice(6).trim(), v]);
  return out;
}

/** "2024-11" -> "2024-10"; "2025-01" -> "2024-12". */
export function previousMonth(p: string) {
  const [y, m] = p.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Chart series with every month present: unpublished months come back as null, so gaps show. */
export function monthlySeries<T extends { period: string }>(rows: T[], value: (r: T) => number | null): { label: string; value: number | null }[] {
  if (!rows.length) return [];
  const by = new Map(rows.map((r) => [r.period, r]));
  const out: { label: string; value: number | null }[] = [];
  let p = rows[0].period;
  const last = rows[rows.length - 1].period;
  for (let guard = 0; guard < 600; guard++) {
    const r = by.get(p);
    out.push({ label: periodLabel(p), value: r ? value(r) : null });
    if (p === last) break;
    const [y, m] = p.split("-").map(Number);
    p = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  return out;
}
