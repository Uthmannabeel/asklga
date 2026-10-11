import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

/**
 * National-layer queries: the directory of all 774 LGAs with how much each has published,
 * allocations, the public scoreboard, the demand signal, and the open-data catalogue.
 */

export type DirectoryRow = {
  id: string;
  name: string;
  state: string;
  zone: string | null;
  demo: boolean;
  records: number; // approved projects + services + assets + public documents
  questions: number;
};

export async function directory(): Promise<DirectoryRow[]> {
  const db = await getDb();
  const lgas = await db.select({ id: s.lgas.id, name: s.lgas.name, state: s.lgas.state, zone: s.lgas.zone, demo: s.lgas.demo }).from(s.lgas);
  const counts = new Map<string, number>();
  const add = (rows: { lgaId: string; n: number }[]) => rows.forEach((r) => counts.set(r.lgaId, (counts.get(r.lgaId) ?? 0) + Number(r.n)));
  add(await db.select({ lgaId: s.projects.lgaId, n: sql<number>`count(*)` }).from(s.projects).where(eq(s.projects.approval, "approved")).groupBy(s.projects.lgaId));
  add(await db.select({ lgaId: s.services.lgaId, n: sql<number>`count(*)` }).from(s.services).where(eq(s.services.approval, "approved")).groupBy(s.services.lgaId));
  add(await db.select({ lgaId: s.assets.lgaId, n: sql<number>`count(*)` }).from(s.assets).where(eq(s.assets.approval, "approved")).groupBy(s.assets.lgaId));
  add(await db.select({ lgaId: s.documents.lgaId, n: sql<number>`count(*)` }).from(s.documents).where(and(eq(s.documents.approval, "approved"), eq(s.documents.visibility, "public"))).groupBy(s.documents.lgaId));
  const q = new Map<string, number>();
  for (const r of await db.select({ lgaId: s.questions.lgaId, n: sql<number>`count(*)` }).from(s.questions).groupBy(s.questions.lgaId)) q.set(r.lgaId, Number(r.n));
  return lgas
    .map((l) => ({ ...l, records: counts.get(l.id) ?? 0, questions: q.get(l.id) ?? 0 }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
}

/** Pass the directory rows when the caller already has them, so the directory is only read once. */
export async function nationalSummary(given?: DirectoryRow[]) {
  const rows = given ?? (await directory());
  const joined = rows.filter((r) => r.records > 0);
  const [alloc] = await (await getDb()).select({ periods: sql<number>`count(distinct period)`, lgas: sql<number>`count(distinct lga_id)`, latest: sql<string | null>`max(period)` }).from(s.allocations);
  return {
    lgas: rows.length,
    // States only: the FCT is counted separately ("36 states and the FCT").
    states: new Set(rows.map((r) => r.state).filter((st) => st !== "Federal Capital Territory")).size,
    joined: joined.length,
    records: rows.reduce((n, r) => n + r.records, 0),
    questions: rows.reduce((n, r) => n + r.questions, 0),
    allocationPeriods: Number(alloc?.periods ?? 0),
    allocationLgas: Number(alloc?.lgas ?? 0),
    latestPeriod: alloc?.latest ?? null,
  };
}

export async function lgaRecordCount(lgaId: string): Promise<number> {
  const db = await getDb();
  const [p] = await db.select({ n: sql<number>`count(*)` }).from(s.projects).where(and(eq(s.projects.lgaId, lgaId), eq(s.projects.approval, "approved")));
  const [sv] = await db.select({ n: sql<number>`count(*)` }).from(s.services).where(and(eq(s.services.lgaId, lgaId), eq(s.services.approval, "approved")));
  const [a] = await db.select({ n: sql<number>`count(*)` }).from(s.assets).where(and(eq(s.assets.lgaId, lgaId), eq(s.assets.approval, "approved")));
  const [d] = await db.select({ n: sql<number>`count(*)` }).from(s.documents).where(and(eq(s.documents.lgaId, lgaId), eq(s.documents.approval, "approved"), eq(s.documents.visibility, "public")));
  return Number(p.n) + Number(sv.n) + Number(a.n) + Number(d.n);
}

export async function allocationsFor(lgaId: string, limit = 36) {
  const db = await getDb();
  return db.select().from(s.allocations).where(eq(s.allocations.lgaId, lgaId)).orderBy(desc(s.allocations.period)).limit(limit);
}

export async function latestAllocation(lgaId: string) {
  return (await allocationsFor(lgaId, 1))[0] ?? null;
}

/** State totals for the latest period on file, for context on an LGA's money page. */
export async function stateAllocationContext(state: string, period: string) {
  const db = await getDb();
  const [r] = await db
    .select({ lgas: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${s.allocations.netNgn}), 0)`, median: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${s.allocations.netNgn}), 0)` })
    .from(s.allocations)
    .innerJoin(s.lgas, eq(s.lgas.id, s.allocations.lgaId))
    .where(and(eq(s.lgas.state, state), eq(s.allocations.period, period)));
  return r;
}

export type ScoreRow = DirectoryRow & { asked30: number; answered30: number; openGaps: number; accuracy: number | null; evalCases: number | null; evalAt: Date | null; evalRun: number | null; evalVerified: boolean };

export async function scoreboard(): Promise<ScoreRow[]> {
  const db = await getDb();
  const rows = await directory();
  const since = new Date(Date.now() - 30 * 86400000);
  const q = new Map<string, { asked: number; answered: number }>();
  for (const r of await db
    .select({ lgaId: s.questions.lgaId, asked: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(gte(s.questions.createdAt, since))
    .groupBy(s.questions.lgaId)) q.set(r.lgaId, { asked: Number(r.asked), answered: Number(r.answered) });
  const gaps = new Map<string, number>();
  for (const r of await db.select({ lgaId: s.questions.lgaId, n: sql<number>`count(*)` }).from(s.questions).where(sql`${s.questions.gapStatus} in ('open','assigned')`).groupBy(s.questions.lgaId)) gaps.set(r.lgaId, Number(r.n));
  const ev = new Map<string, { accuracy: number; cases: number; ranAt: Date; id: number; verified: boolean }>();
  for (const r of await db.select().from(s.evalRuns).orderBy(desc(s.evalRuns.ranAt))) if (!ev.has(r.lgaId)) ev.set(r.lgaId, { accuracy: r.accuracy, cases: r.cases, ranAt: r.ranAt, id: r.id, verified: r.verified });
  return rows
    .filter((r) => r.records > 0 || r.questions > 0)
    .map((r) => ({
      ...r,
      asked30: q.get(r.id)?.asked ?? 0,
      answered30: q.get(r.id)?.answered ?? 0,
      openGaps: gaps.get(r.id) ?? 0,
      accuracy: ev.get(r.id)?.accuracy ?? null,
      evalCases: ev.get(r.id)?.cases ?? null,
      evalAt: ev.get(r.id)?.ranAt ?? null,
      evalRun: ev.get(r.id)?.id ?? null,
      evalVerified: ev.get(r.id)?.verified ?? false,
    }))
    .sort((a, b) => b.records - a.records || b.asked30 - a.asked30);
}

/** The demand signal: what Nigerians ask their LGAs and cannot get answered, in aggregate. */
export async function insights(days = 90) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400000);
  const byState = await db
    .select({ state: s.lgas.state, zone: s.lgas.zone, asked: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where ${s.questions.answered})`, lgas: sql<number>`count(distinct ${s.questions.lgaId})` })
    .from(s.questions)
    .innerJoin(s.lgas, eq(s.lgas.id, s.questions.lgaId))
    .where(gte(s.questions.createdAt, since))
    .groupBy(s.lgas.state, s.lgas.zone)
    .orderBy(desc(sql`count(*)`));
  const byLanguage = await db
    .select({ language: s.questions.language, asked: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(gte(s.questions.createdAt, since))
    .groupBy(s.questions.language)
    .orderBy(desc(sql`count(*)`));
  const byAudience = await db
    .select({ audience: s.questions.audience, asked: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(gte(s.questions.createdAt, since))
    .groupBy(s.questions.audience);
  // Only questions asked more than once are shown, so a one-off personal question never appears.
  const topUnanswered = await db
    .select({ question: sql<string>`min(${s.questions.question})`, n: sql<number>`count(*)`, lgas: sql<number>`count(distinct ${s.questions.lgaId})` })
    .from(s.questions)
    .where(and(gte(s.questions.createdAt, since), eq(s.questions.answered, false), eq(s.questions.audience, "resident")))
    .groupBy(sql`lower(${s.questions.question})`)
    .having(sql`count(*) >= 2`)
    .orderBy(desc(sql`count(*)`))
    .limit(30);
  const [totals] = await db
    .select({ asked: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)`, lgas: sql<number>`count(distinct lga_id)` })
    .from(s.questions)
    .where(gte(s.questions.createdAt, since));
  return { since, byState, byLanguage, byAudience, topUnanswered, totals };
}

/** Open-data catalogue of every published register, DCAT-style, for data.gov.ng-type harvesters. */
export async function catalogue(base: string) {
  const rows = (await directory()).filter((r) => r.records > 0);
  const licence = "https://creativecommons.org/licenses/by/4.0/";
  return {
    "@context": "https://www.w3.org/ns/dcat",
    "@type": "dcat:Catalog",
    title: "AskLGA open data catalogue",
    description: "Approved registers of Nigerian local government areas: projects, public assets, services and investment profiles, each record with its source, approval and last-verified date.",
    license: licence,
    conformsTo: `${base}/standard`,
    publisher: { "@type": "foaf:Organization", name: "AskLGA" },
    dataset: rows.flatMap((r) =>
      ["projects", "assets", "services", "investment"].map((set) => ({
        "@type": "dcat:Dataset",
        identifier: `${r.id}/${set}`,
        title: `${r.name} LGA, ${r.state}: ${set}`,
        spatial: `${r.name} Local Government Area, ${r.state} State, Nigeria`,
        license: licence,
        landingPage: `${base}/${r.id}/open-data`,
        distribution: [
          { "@type": "dcat:Distribution", mediaType: "application/json", accessURL: `${base}/api/${r.id}/open/${set}.json` },
          { "@type": "dcat:Distribution", mediaType: "text/csv", accessURL: `${base}/api/${r.id}/open/${set}.csv` },
        ],
      })),
    ),
  };
}
