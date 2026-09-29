import { cache } from "react";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

export type Scope = "public" | "internal";

/** Cached per request: the layout, the shell, metadata and the page all ask for the same row. */
export const getLga = cache(async (id: string) => {
  const db = await getDb();
  const rows = await db.select().from(s.lgas).where(eq(s.lgas.id, id)).limit(1);
  return rows[0] ?? null;
});

export async function listLgas() {
  const db = await getDb();
  return db.select().from(s.lgas).orderBy(asc(s.lgas.state), asc(s.lgas.name));
}

export async function listProjects(lgaId: string, opts: { approvedOnly?: boolean; status?: string } = {}) {
  const db = await getDb();
  const conds = [eq(s.projects.lgaId, lgaId)];
  if (opts.approvedOnly !== false) conds.push(eq(s.projects.approval, "approved"));
  if (opts.status) conds.push(eq(s.projects.status, opts.status as s.ProjectStatus));
  return db.select().from(s.projects).where(and(...conds)).orderBy(asc(s.projects.id));
}

export async function getProject(id: string) {
  const db = await getDb();
  const rows = await db.select().from(s.projects).where(eq(s.projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listStatusUpdates(projectId: string) {
  const db = await getDb();
  return db.select().from(s.statusUpdates).where(eq(s.statusUpdates.projectId, projectId)).orderBy(desc(s.statusUpdates.createdAt));
}

export async function listPhotoReports(projectId: string, approvedOnly = true) {
  const db = await getDb();
  const conds = [eq(s.photoReports.projectId, projectId)];
  if (approvedOnly) conds.push(eq(s.photoReports.status, "approved"));
  return db.select().from(s.photoReports).where(and(...conds)).orderBy(desc(s.photoReports.createdAt));
}

export async function listServices(lgaId: string, approvedOnly = true) {
  const db = await getDb();
  const conds = [eq(s.services.lgaId, lgaId)];
  if (approvedOnly) conds.push(eq(s.services.approval, "approved"));
  return db.select().from(s.services).where(and(...conds)).orderBy(asc(s.services.category), asc(s.services.name));
}

export async function getService(id: string) {
  const db = await getDb();
  const rows = await db.select().from(s.services).where(eq(s.services.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listAssets(lgaId: string, approvedOnly = true) {
  const db = await getDb();
  const conds = [eq(s.assets.lgaId, lgaId)];
  if (approvedOnly) conds.push(eq(s.assets.approval, "approved"));
  return db.select().from(s.assets).where(and(...conds)).orderBy(asc(s.assets.type), asc(s.assets.name));
}

export async function getAsset(id: string) {
  const db = await getDb();
  const rows = await db.select().from(s.assets).where(eq(s.assets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listProfile(lgaId: string, approvedOnly = true) {
  const db = await getDb();
  const conds = [eq(s.profileSections.lgaId, lgaId)];
  if (approvedOnly) conds.push(eq(s.profileSections.approval, "approved"));
  return db.select().from(s.profileSections).where(and(...conds)).orderBy(asc(s.profileSections.ord));
}

export async function listDocuments(lgaId: string, scope: Scope, approvedOnly = true) {
  const db = await getDb();
  const conds = [eq(s.documents.lgaId, lgaId)];
  if (approvedOnly) conds.push(eq(s.documents.approval, "approved"));
  if (scope === "public") conds.push(eq(s.documents.visibility, "public"));
  return db.select().from(s.documents).where(and(...conds)).orderBy(desc(s.documents.createdAt));
}

export async function getDocument(id: string) {
  const db = await getDb();
  const rows = await db.select().from(s.documents).where(eq(s.documents.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Full-text search over document chunks (Postgres 'simple' config, so it works across languages). */
export async function searchChunks(lgaId: string, scope: Scope, query: string, limit = 8) {
  const db = await getDb();
  // The tsv column uses the 'simple' dictionary (no stop words, no stemming) so that Pidgin,
  // Hausa, Yoruba and Igbo questions are searched as written. That means the query must be
  // OR-based: requiring every word of a question ("how", "does", "the") to appear in a passage
  // matched almost nothing. Terms are prefix-matched so "list" also finds "lists", and passages
  // are ranked by how many terms they contain.
  const terms = [...new Set(
    query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  )];
  if (!terms.length) return [];
  const tsquery = terms.map((t) => `${t}:*`).join(" | ");
  const visibility = scope === "internal" ? sql`TRUE` : sql`${s.chunks.visibility} = 'public'`;
  const rows = await db
    .select({
      id: s.chunks.id,
      documentId: s.chunks.documentId,
      ord: s.chunks.ord,
      text: s.chunks.text,
      title: s.documents.title,
      rank: sql<number>`ts_rank(${s.chunks}.tsv, to_tsquery('simple', ${tsquery}))`,
    })
    .from(s.chunks)
    .innerJoin(s.documents, eq(s.documents.id, s.chunks.documentId))
    .where(
      and(
        eq(s.chunks.lgaId, lgaId),
        visibility,
        eq(s.documents.approval, "approved"),
        sql`${s.chunks}.tsv @@ to_tsquery('simple', ${tsquery})`,
      ),
    )
    .orderBy(sql`ts_rank(${s.chunks}.tsv, to_tsquery('simple', ${tsquery})) DESC`)
    .limit(limit);
  return rows;
}

export async function adminStats(lgaId: string) {
  const db = await getDb();
  const [q] = await db
    .select({
      total: sql<number>`count(*)`,
      answered: sql<number>`count(*) filter (where answered)`,
      escalated: sql<number>`count(*) filter (where escalated)`,
      up: sql<number>`count(*) filter (where feedback = 'up')`,
      down: sql<number>`count(*) filter (where feedback = 'down')`,
      flagged: sql<number>`count(*) filter (where flagged and not flag_resolved)`,
      gaps: sql<number>`count(*) filter (where gap_status = 'open')`,
      staff: sql<number>`count(*) filter (where audience = 'staff')`,
      investors: sql<number>`count(*) filter (where audience = 'investor')`,
    })
    .from(s.questions)
    .where(eq(s.questions.lgaId, lgaId));
  const byLang = await db
    .select({ language: s.questions.language, n: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(eq(s.questions.lgaId, lgaId))
    .groupBy(s.questions.language);
  const [p] = await db
    .select({
      total: sql<number>`count(*)`,
      verified: sql<number>`count(*) filter (where last_verified is not null)`,
      withEvidence: sql<number>`count(*) filter (where jsonb_array_length(evidence) > 0)`,
      amount: sql<number>`coalesce(sum(amount_ngn), 0)`,
    })
    .from(s.projects)
    .where(and(eq(s.projects.lgaId, lgaId), eq(s.projects.approval, "approved")));
  const [t] = await db
    .select({ open: sql<number>`count(*) filter (where status <> 'closed')` })
    .from(s.tickets)
    .where(eq(s.tickets.lgaId, lgaId));
  const [d] = await db
    .select({ total: sql<number>`count(*)`, internal: sql<number>`count(*) filter (where visibility = 'internal')`, stale: sql<number>`count(*) filter (where review_by is not null and review_by < to_char(now(), 'YYYY-MM-DD'))` })
    .from(s.documents)
    .where(eq(s.documents.lgaId, lgaId));
  return { questions: q, byLang, projects: p, tickets: t, documents: d };
}

export async function recentQuestions(lgaId: string, limit = 50) {
  const db = await getDb();
  return db.select().from(s.questions).where(eq(s.questions.lgaId, lgaId)).orderBy(desc(s.questions.createdAt)).limit(limit);
}

export async function topQuestions(lgaId: string, limit = 15) {
  const db = await getDb();
  return db
    .select({ question: s.questions.question, n: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(eq(s.questions.lgaId, lgaId))
    .groupBy(s.questions.question)
    .orderBy(sql`count(*) DESC`)
    .limit(limit);
}
