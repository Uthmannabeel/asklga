import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema as s, type Db } from "@/db";
import { nextId } from "./ids";
import { memo } from "./memo";
import { MIN_RATERS_RANK, RATING_WINDOW_MONTHS, keyedHash, recentMonths, responseStats, summariseRatings, type IssueInput, type RatingInput, type ResponseStats } from "./participationRules";

/** Database side of resident participation: issues, ratings and officials. Rules live in participationRules.ts. */

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSCODE || "asklga-dev";
}

export function hashIp(ip: string): string {
  return keyedHash(ip, secret());
}

/* ---------- Issues ---------- */

export async function createIssue(lgaId: string, input: IssueInput, ip: string): Promise<string> {
  const db = await getDb();
  const id = await nextId(db, "issues", lgaId, "R");
  await db.insert(s.issues).values({ id, lgaId, ...input, ipHash: hashIp(ip) });
  await db.insert(s.issueUpdates).values({ issueId: id, oldStatus: null, newStatus: "received", note: null, by: "Resident" });
  return id;
}

export async function listIssues(lgaId: string, opts: { status?: string; fn?: string; limit?: number; includeHidden?: boolean } = {}) {
  const db = await getDb();
  const where = [eq(s.issues.lgaId, lgaId)];
  if (!opts.includeHidden) where.push(eq(s.issues.hidden, false));
  if (opts.status) where.push(eq(s.issues.status, opts.status as s.IssueStatus));
  if (opts.fn) where.push(eq(s.issues.fn, opts.fn));
  return db.select().from(s.issues).where(and(...where)).orderBy(desc(s.issues.createdAt)).limit(opts.limit ?? 500);
}

export async function getIssue(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(s.issues).where(eq(s.issues.id, id)).limit(1);
  return row ?? null;
}

export async function listIssueUpdates(issueId: string) {
  const db = await getDb();
  return db.select().from(s.issueUpdates).where(eq(s.issueUpdates.issueId, issueId)).orderBy(asc(s.issueUpdates.createdAt));
}

/** One more resident saying the problem affects them too. Returns the new count, or null if unknown. */
export async function supportIssue(id: string): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .update(s.issues)
    .set({ supports: sql`${s.issues.supports} + 1` })
    .where(and(eq(s.issues.id, id), eq(s.issues.hidden, false)))
    .returning({ supports: s.issues.supports });
  return row?.supports ?? null;
}

export async function issueStats(lgaId: string): Promise<ResponseStats> {
  const db = await getDb();
  const rows = await db
    .select({ status: s.issues.status, createdAt: s.issues.createdAt, respondedAt: s.issues.respondedAt, resolvedAt: s.issues.resolvedAt })
    .from(s.issues)
    .where(and(eq(s.issues.lgaId, lgaId), eq(s.issues.hidden, false)));
  return responseStats(rows);
}

export type IssueFeedRow = typeof s.issues.$inferSelect & { lgaName: string; state: string };

/** The latest public issues across every council. */
export function recentIssues(limit = 60): Promise<IssueFeedRow[]> {
  return memo(`issues:recent:${limit}`, async () => {
    const db = await getDb();
    const rows = await db
      .select({ issue: s.issues, lgaName: s.lgas.name, state: s.lgas.state })
      .from(s.issues)
      .innerJoin(s.lgas, eq(s.lgas.id, s.issues.lgaId))
      .where(eq(s.issues.hidden, false))
      .orderBy(desc(s.issues.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r.issue, lgaName: r.lgaName, state: r.state }));
  }, 60_000);
}

export type ResponseRow = ResponseStats & { id: string; name: string; state: string };

/** Every council with at least one public issue, with its response record. */
export function responseRecords(): Promise<ResponseRow[]> {
  return memo("issues:records", async () => {
    const db = await getDb();
    const rows = await db
      .select({ lgaId: s.issues.lgaId, name: s.lgas.name, state: s.lgas.state, status: s.issues.status, createdAt: s.issues.createdAt, respondedAt: s.issues.respondedAt, resolvedAt: s.issues.resolvedAt })
      .from(s.issues)
      .innerJoin(s.lgas, eq(s.lgas.id, s.issues.lgaId))
      .where(eq(s.issues.hidden, false));
    const by = new Map<string, { name: string; state: string; rows: typeof rows }>();
    for (const r of rows) {
      const e = by.get(r.lgaId) ?? { name: r.name, state: r.state, rows: [] };
      e.rows.push(r);
      by.set(r.lgaId, e);
    }
    return [...by.entries()]
      .map(([id, e]) => ({ id, name: e.name, state: e.state, ...responseStats(e.rows) }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, 60_000);
}

/* ---------- Ratings ---------- */

/** Records or replaces this month's score from one address. Returns whether it replaced an earlier one. */
export async function saveRating(lgaId: string, input: RatingInput, ip: string): Promise<{ replaced: boolean }> {
  const db = await getDb();
  const emailHash = keyedHash(input.email, secret());
  const existing = await db.select({ id: s.ratings.id }).from(s.ratings).where(and(eq(s.ratings.lgaId, lgaId), eq(s.ratings.month, input.month), eq(s.ratings.emailHash, emailHash))).limit(1);
  const values = { lgaId, month: input.month, emailHash, scores: input.scores, comment: input.comment, ipHash: hashIp(ip) };
  if (existing.length) {
    await db.update(s.ratings).set({ ...values, createdAt: new Date() }).where(eq(s.ratings.id, existing[0].id));
  } else {
    await db.insert(s.ratings).values(values);
  }
  return { replaced: existing.length > 0 };
}

export async function reportCard(lgaId: string) {
  const months = recentMonths(RATING_WINDOW_MONTHS);
  const db = await getDb();
  const rows = await db.select({ scores: s.ratings.scores }).from(s.ratings).where(and(eq(s.ratings.lgaId, lgaId), inArray(s.ratings.month, months)));
  return summariseRatings(rows, months);
}

export type CardRow = ReturnType<typeof summariseRatings> & { id: string; name: string; state: string };

/** Report cards for every council with any rating in the window; only those with MIN_RATERS_RANK raters are comparable. */
export function reportCards(): Promise<{ rows: CardRow[]; months: string[] }> {
  return memo("ratings:cards", async () => {
    const months = recentMonths(RATING_WINDOW_MONTHS);
    const db = await getDb();
    const rows = await db
      .select({ lgaId: s.ratings.lgaId, name: s.lgas.name, state: s.lgas.state, scores: s.ratings.scores })
      .from(s.ratings)
      .innerJoin(s.lgas, eq(s.lgas.id, s.ratings.lgaId))
      .where(inArray(s.ratings.month, months));
    const by = new Map<string, { name: string; state: string; rows: { scores: Partial<Record<string, number>> }[] }>();
    for (const r of rows) {
      const e = by.get(r.lgaId) ?? { name: r.name, state: r.state, rows: [] };
      e.rows.push({ scores: r.scores });
      by.set(r.lgaId, e);
    }
    const cards = [...by.entries()].map(([id, e]) => ({ id, name: e.name, state: e.state, ...summariseRatings(e.rows, months) }));
    cards.sort((a, b) => {
      const ar = a.raters >= MIN_RATERS_RANK ? 1 : 0;
      const br = b.raters >= MIN_RATERS_RANK ? 1 : 0;
      return br - ar || (b.overall ?? 0) - (a.overall ?? 0) || b.raters - a.raters || a.name.localeCompare(b.name);
    });
    return { rows: cards, months };
  }, 60_000);
}

/** Staff view: this council's ratings with comments, newest first. */
export async function listRatings(lgaId: string, limit = 200) {
  const db = await getDb();
  return db.select().from(s.ratings).where(eq(s.ratings.lgaId, lgaId)).orderBy(desc(s.ratings.createdAt)).limit(limit);
}

/* ---------- Officials ---------- */

const ROLE_ORDER = ["chairman", "vice_chairman", "leader", "secretary", "hlga", "treasurer", "councillor", "other"];

export async function listOfficials(lgaId: string, approvedOnly = true) {
  const db = await getDb();
  const where = approvedOnly ? and(eq(s.officials.lgaId, lgaId), eq(s.officials.approval, "approved")) : eq(s.officials.lgaId, lgaId);
  const rows = await db.select().from(s.officials).where(where).orderBy(asc(s.officials.ord), asc(s.officials.name));
  return rows.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.ord - b.ord || a.name.localeCompare(b.name));
}

export async function getOfficial(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(s.officials).where(eq(s.officials.id, id)).limit(1);
  return row ?? null;
}

/** Councils with an approved chairman on file, for the national directory. */
export function chairmen(): Promise<Map<string, string>> {
  return memo("officials:chairmen", async () => {
    const db = await getDb();
    const rows = await db.select({ lgaId: s.officials.lgaId, name: s.officials.name }).from(s.officials).where(and(eq(s.officials.role, "chairman"), eq(s.officials.approval, "approved"), sql`${s.officials.until} is null`));
    return new Map(rows.map((r) => [r.lgaId, r.name]));
  });
}

export type { Db };
