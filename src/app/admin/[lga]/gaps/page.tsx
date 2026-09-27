import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { formatDate } from "@/lib/format";
import { assignGap, resolveGap } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

/** Data-gap queue: open → assigned → resolved. Repeats of a question are folded in as duplicates and close with it. */
export default async function Gaps({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const queue = await db
    .select({
      id: sql<number>`min(${s.questions.id})`,
      question: s.questions.question,
      language: s.questions.language,
      audience: s.questions.audience,
      status: sql<string>`max(${s.questions.gapStatus})`,
      owner: sql<string | null>`max(${s.questions.gapOwner})`,
      summary: sql<string | null>`max(${s.questions.gapResolution})`,
      times: sql<number>`count(*)`,
      first: sql<Date>`min(${s.questions.createdAt})`,
      last: sql<Date>`max(${s.questions.createdAt})`,
    })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), sql`${s.questions.gapStatus} in ('open', 'assigned', 'duplicate')`))
    .groupBy(s.questions.question, s.questions.language, s.questions.audience)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${s.questions.createdAt})`))
    .limit(200);
  const resolved = await db
    .select()
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), eq(s.questions.gapStatus, "resolved")))
    .orderBy(desc(s.questions.gapResolvedAt))
    .limit(30);
  const officers = await db.select({ name: s.staffUsers.name }).from(s.staffUsers).where(and(eq(s.staffUsers.active, true), sql`${s.staffUsers.lgaId} = ${lga} or ${s.staffUsers.lgaId} is null`)).orderBy(asc(s.staffUsers.name));
  return (
    <>
      <section className="grid gap-3">
        <h1>Data gaps</h1>
        <p className="measure small">Every question the records could not answer, grouped by question. Assign an owner, add the missing record, then mark the gap resolved and name the record that now answers it. All repeats close together.</p>
        {queue.length === 0 ? <p className="muted">No open gaps.</p> : null}
        <ul className="register">
          {queue.map((q) => (
            <li key={q.id} className="register-row">
              <span>{q.question}</span>
              <span className="small muted">
                Asked {Number(q.times)} time{Number(q.times) === 1 ? "" : "s"}, first {formatDate(new Date(q.first))}, last {formatDate(new Date(q.last))}. {q.language}, {q.audience}.
                {q.summary ? ` Asked for: ${q.summary}.` : ""} {q.status === "assigned" && q.owner ? `Owner: ${q.owner}.` : "Unassigned."}
              </span>
              <div className="flex flex-wrap gap-4">
                <form action={assignGap} className="flex flex-wrap gap-2 items-center">
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="lgaId" value={lga} />
                  <label className="sr-only" htmlFor={`owner-${q.id}`}>Owner</label>
                  <input id={`owner-${q.id}`} name="owner" list="officers" placeholder="Officer name" defaultValue={q.owner ?? ""} style={{ maxWidth: "14rem" }} />
                  <button type="submit" className="btn btn-quiet btn-sm">Assign</button>
                </form>
                <form action={resolveGap} className="flex flex-wrap gap-2 items-center">
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="lgaId" value={lga} />
                  <label className="sr-only" htmlFor={`res-${q.id}`}>Which record answers it now</label>
                  <input id={`res-${q.id}`} name="resolution" placeholder="Which record answers it now, e.g. OBA-S-0013" style={{ maxWidth: "24rem" }} />
                  <button type="submit" className="btn btn-sm">Mark resolved</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <datalist id="officers">{officers.map((o) => <option key={o.name} value={o.name} />)}</datalist>
      </section>
      <section className="grid gap-2">
        <h2>Recently resolved</h2>
        {resolved.length === 0 ? <p className="muted">Nothing resolved yet.</p> : null}
        <ul className="register">
          {resolved.map((q) => (
            <li key={q.id} className="register-row">
              <span>{q.question}</span>
              <span className="small muted">{q.gapResolution ?? "resolved"}{q.gapResolvedAt ? `, ${formatDate(q.gapResolvedAt)}` : ""}{q.gapOwner ? `, owner ${q.gapOwner}` : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
