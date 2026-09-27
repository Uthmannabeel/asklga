import Link from "next/link";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { adminStats, getLga } from "@/lib/queries";
import { formatDate, isoDateLagos } from "@/lib/format";

export const dynamic = "force-dynamic";

const FAULT_LABEL: Record<string, string> = { record: "record wrong or missing", retrieval: "record not found", wording: "wording", not_wrong: "answer was correct" };

/** One-page report for the chairman and the state contact. Calendar month by default (?month=2026-09), or the last 30 days (?period=30d). Printable. */
export default async function MonthlyReport({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ month?: string; period?: string }> }) {
  const { lga } = await params;
  const sp = await searchParams;
  const db = await getDb();

  // Period bounds in Lagos time.
  const today = isoDateLagos(new Date());
  let from: Date;
  let to: Date;
  let label: string;
  if (sp.period === "30d") {
    to = new Date();
    from = new Date(to.getTime() - 30 * 86400000);
    label = `Last 30 days to ${formatDate(today)}`;
  } else {
    const m = /^(\d{4})-(\d{2})$/.exec(sp.month ?? "") ?? /^(\d{4})-(\d{2})/.exec(today);
    const y = Number(m![1]);
    const mo = Number(m![2]);
    from = new Date(Date.UTC(y, mo - 1, 1, -1)); // midnight WAT is 23:00 UTC the day before
    to = new Date(Date.UTC(y, mo, 1, -1));
    label = `${from.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Lagos" })}`;
  }
  const prevMonth = (() => {
    const m = /^(\d{4})-(\d{2})/.exec(sp.month ?? today)!;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();

  const inPeriod = (col: typeof s.questions.createdAt) => and(gte(col, from), lt(col, to));
  const [row, st] = await Promise.all([getLga(lga), adminStats(lga)]);
  const [m] = await db
    .select({
      asked: sql<number>`count(*)`,
      answered: sql<number>`count(*) filter (where answered)`,
      refused: sql<number>`count(*) filter (where not answered)`,
      up: sql<number>`count(*) filter (where feedback = 'up')`,
      down: sql<number>`count(*) filter (where feedback = 'down')`,
      escalated: sql<number>`count(*) filter (where escalated)`,
      flagsRaised: sql<number>`count(*) filter (where flagged)`,
      medianLatency: sql<number>`coalesce(percentile_cont(0.5) within group (order by latency_ms), 0)`,
    })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), inPeriod(s.questions.createdAt)));
  // Closures are counted by when they were closed, not when the question was asked.
  const [closed] = await db
    .select({
      gapsClosed: sql<number>`count(*) filter (where gap_status = 'resolved' and gap_resolved_at >= ${from} and gap_resolved_at < ${to})`,
      flagsClosed: sql<number>`count(*) filter (where flag_resolved and flag_resolved_at >= ${from} and flag_resolved_at < ${to})`,
      gapsOpen: sql<number>`count(*) filter (where gap_status in ('open', 'assigned'))`,
      flagsOpen: sql<number>`count(*) filter (where flagged and not flag_resolved)`,
    })
    .from(s.questions)
    .where(eq(s.questions.lgaId, lga));
  const byLang = await db
    .select({ language: s.questions.language, n: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)`, escalated: sql<number>`count(*) filter (where escalated)` })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), inPeriod(s.questions.createdAt)))
    .groupBy(s.questions.language)
    .orderBy(desc(sql`count(*)`));
  const byAudience = await db
    .select({ audience: s.questions.audience, n: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), inPeriod(s.questions.createdAt)))
    .groupBy(s.questions.audience);
  const faults = await db
    .select({ fault: s.questions.flagFault, n: sql<number>`count(*)` })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), eq(s.questions.flagResolved, true), gte(s.questions.flagResolvedAt, from), lt(s.questions.flagResolvedAt, to)))
    .groupBy(s.questions.flagFault);
  const top = await db
    .select({ question: s.questions.question, n: sql<number>`count(*)`, answered: sql<number>`count(*) filter (where answered)` })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), inPeriod(s.questions.createdAt)))
    .groupBy(s.questions.question)
    .orderBy(sql`count(*) DESC`)
    .limit(8);
  const updates = await db
    .select({ projectId: s.statusUpdates.projectId, name: s.projects.name, newStatus: s.statusUpdates.newStatus, createdAt: s.statusUpdates.createdAt })
    .from(s.statusUpdates)
    .innerJoin(s.projects, eq(s.projects.id, s.statusUpdates.projectId))
    .where(and(eq(s.projects.lgaId, lga), gte(s.statusUpdates.createdAt, from), lt(s.statusUpdates.createdAt, to)))
    .orderBy(desc(s.statusUpdates.createdAt))
    .limit(20);
  const [tk] = await db
    .select({
      opened: sql<number>`count(*) filter (where created_at >= ${from} and created_at < ${to})`,
      open: sql<number>`count(*) filter (where status <> 'closed')`,
    })
    .from(s.tickets)
    .where(eq(s.tickets.lgaId, lga));
  const pct = (a: number, b: number) => (Number(b) ? `${Math.round((Number(a) / Number(b)) * 100)}%` : "n/a");

  return (
    <section className="grid gap-4 measure">
      <h1>Report, {row?.name} LGA</h1>
      <p className="small muted">
        {label}. Print this page for the chairman and the state contact.{" "}
        <Link href={`/admin/${lga}/report?month=${prevMonth}`}>Previous month</Link> · <Link href={`/admin/${lga}/report`}>This month</Link> · <Link href={`/admin/${lga}/report?period=30d`}>Last 30 days</Link>
      </p>
      <table>
        <tbody>
          <tr><th>Questions asked</th><td>{m.asked}</td></tr>
          <tr><th>Answered from approved records</th><td>{m.answered} ({pct(m.answered, m.asked)})</td></tr>
          <tr><th>Refused (not in records, out of scope)</th><td>{m.refused}</td></tr>
          <tr><th>Median time to answer</th><td>{(Number(m.medianLatency) / 1000).toFixed(1)} s</td></tr>
          <tr><th>Rated useful / not useful</th><td>{m.up} / {m.down}</td></tr>
          <tr><th>Escalated to an officer</th><td>{m.escalated}</td></tr>
          <tr><th>Tickets opened / still open</th><td>{tk.opened} / {tk.open}</td></tr>
          <tr><th>Data gaps closed / still open</th><td>{closed.gapsClosed} / {closed.gapsOpen}</td></tr>
          <tr><th>Answers flagged / flags closed / still open</th><td>{m.flagsRaised} / {closed.flagsClosed} / {closed.flagsOpen}</td></tr>
          <tr><th>Projects on the register</th><td>{st.projects.total}, {st.projects.withEvidence} with evidence</td></tr>
          <tr><th>Documents past review date</th><td>{st.documents.stale}</td></tr>
        </tbody>
      </table>
      <h2>By language and audience</h2>
      <table>
        <tbody>
          {byLang.map((l) => <tr key={l.language ?? "none"}><th>{l.language ?? "unknown"}</th><td>{l.n} asked, {pct(l.answered, l.n)} answered, {l.escalated} escalated</td></tr>)}
          {byAudience.map((a) => <tr key={a.audience}><th>{a.audience}s</th><td>{a.n} asked, {pct(a.answered, a.n)} answered</td></tr>)}
        </tbody>
      </table>
      {faults.length ? (
        <>
          <h2>What was at fault in closed flags</h2>
          <ul className="list-disc pl-5">{faults.map((f) => <li key={f.fault ?? "none"}>{FAULT_LABEL[f.fault ?? ""] ?? "not classified"}: {f.n}</li>)}</ul>
        </>
      ) : null}
      <h2>Most asked</h2>
      {top.length === 0 ? <p className="muted">No questions in this period.</p> : <ol className="list-decimal pl-5">{top.map((t) => <li key={t.question}>{t.question} ({t.n}{Number(t.answered) < Number(t.n) ? `, ${Number(t.n) - Number(t.answered)} unanswered` : ""})</li>)}</ol>}
      <h2>Project status changes</h2>
      {updates.length === 0 ? <p className="muted">None recorded.</p> : <ul className="list-disc pl-5">{updates.map((u, i) => <li key={i}>{u.projectId} {u.name}: {u.newStatus}, {formatDate(u.createdAt)}</li>)}</ul>}
    </section>
  );
}
