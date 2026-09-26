import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { adminStats, getLga } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** One-page monthly report for the chairman and the state contact. Printable. */
export default async function MonthlyReport({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const [row, st] = await Promise.all([getLga(lga), adminStats(lga)]);
  const [m] = await db
    .select({
      asked: sql<number>`count(*)`,
      answered: sql<number>`count(*) filter (where answered)`,
      up: sql<number>`count(*) filter (where feedback = 'up')`,
      down: sql<number>`count(*) filter (where feedback = 'down')`,
      escalated: sql<number>`count(*) filter (where escalated)`,
      gapsClosed: sql<number>`count(*) filter (where gap_status = 'resolved')`,
      flagsClosed: sql<number>`count(*) filter (where flagged and flag_resolved)`,
      medianLatency: sql<number>`coalesce(percentile_cont(0.5) within group (order by latency_ms), 0)`,
    })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), gte(s.questions.createdAt, since)));
  const top = await db
    .select({ question: s.questions.question, n: sql<number>`count(*)` })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), gte(s.questions.createdAt, since)))
    .groupBy(s.questions.question)
    .orderBy(sql`count(*) DESC`)
    .limit(8);
  const updates = await db
    .select({ projectId: s.statusUpdates.projectId, newStatus: s.statusUpdates.newStatus, createdAt: s.statusUpdates.createdAt })
    .from(s.statusUpdates)
    .where(gte(s.statusUpdates.createdAt, since))
    .orderBy(desc(s.statusUpdates.createdAt))
    .limit(20);

  return (
    <section className="grid gap-4 measure">
      <h1>Monthly report, {row?.name} LGA</h1>
      <p className="small muted">Last 30 days to {new Date().toISOString().slice(0, 10)}. Print this page for the chairman and the state contact.</p>
      <table>
        <tbody>
          <tr><th>Questions asked</th><td>{m.asked}</td></tr>
          <tr><th>Answered from approved records</th><td>{m.answered} ({Number(m.asked) ? Math.round((Number(m.answered) / Number(m.asked)) * 100) : 0}%)</td></tr>
          <tr><th>Median time to answer</th><td>{(Number(m.medianLatency) / 1000).toFixed(1)} s</td></tr>
          <tr><th>Rated useful / not useful</th><td>{m.up} / {m.down}</td></tr>
          <tr><th>Escalated to an officer</th><td>{m.escalated}</td></tr>
          <tr><th>Data gaps closed</th><td>{m.gapsClosed}</td></tr>
          <tr><th>Flagged answers fixed</th><td>{m.flagsClosed}</td></tr>
          <tr><th>Projects on the register</th><td>{st.projects.total}, {st.projects.withEvidence} with evidence</td></tr>
          <tr><th>Open tickets</th><td>{st.tickets.open}</td></tr>
          <tr><th>Documents past review date</th><td>{st.documents.stale}</td></tr>
        </tbody>
      </table>
      <h2>Most asked this month</h2>
      <ol className="list-decimal pl-5">{top.map((t) => <li key={t.question}>{t.question} ({t.n})</li>)}</ol>
      <h2>Project status changes this month</h2>
      {updates.length === 0 ? <p className="muted">None recorded.</p> : <ul className="list-disc pl-5">{updates.map((u, i) => <li key={i}>{u.projectId} to {u.newStatus}, {u.createdAt.toISOString().slice(0, 10)}</li>)}</ul>}
    </section>
  );
}
