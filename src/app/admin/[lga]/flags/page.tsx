import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { formatDate } from "@/lib/format";
import { resolveFlag } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const FAULT_LABEL: Record<string, string> = { record: "Record was wrong or missing", retrieval: "Right record, not found", wording: "Right record, wrong wording", not_wrong: "Answer was correct" };

export default async function Flags({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const open = await db.select().from(s.questions).where(and(eq(s.questions.lgaId, lga), eq(s.questions.flagged, true), eq(s.questions.flagResolved, false))).orderBy(desc(s.questions.createdAt)).limit(200);
  const byFault = await db
    .select({ fault: s.questions.flagFault, n: sql<number>`count(*)` })
    .from(s.questions)
    .where(and(eq(s.questions.lgaId, lga), eq(s.questions.flagged, true), eq(s.questions.flagResolved, true)))
    .groupBy(s.questions.flagFault);
  const recent = await db.select().from(s.questions).where(and(eq(s.questions.lgaId, lga), eq(s.questions.flagged, true), eq(s.questions.flagResolved, true))).orderBy(desc(s.questions.flagResolvedAt)).limit(10);
  return (
    <>
      <section className="grid gap-3">
        <h1>Flagged answers</h1>
        <p className="measure small">Answers a resident or a staff member reported as wrong. Decide what was at fault, fix it, and log what you did. The fault classes feed the monthly report so the LGA can see whether records, retrieval or wording need work.</p>
        {open.length === 0 ? <p className="muted">No open flags.</p> : null}
        <ul className="register">
          {open.map((q) => (
            <li key={q.id} className="register-row">
              <span className="font-bold">{q.question}</span>
              <span className="answer" style={{ fontSize: "1rem" }}>{q.answer}</span>
              <span className="small muted">Cited: {q.citations.map((c) => c.id).join(", ") || "nothing"}. Asked {formatDate(q.createdAt)}. Flag: {q.flagNote}</span>
              <form action={resolveFlag} className="grid gap-2 md:grid-cols-[16rem_1fr_auto] items-end">
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="lgaId" value={lga} />
                <div className="grid gap-1">
                  <label htmlFor={`fault-${q.id}`} className="small">What was at fault</label>
                  <select id={`fault-${q.id}`} name="fault" required defaultValue="">
                    <option value="" disabled>Choose</option>
                    {Object.entries(FAULT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label htmlFor={`res-${q.id}`} className="small">What was fixed</label>
                  <input id={`res-${q.id}`} name="resolution" placeholder="e.g. corrected the fee on OBA-S-0003" required />
                </div>
                <button type="submit" className="btn btn-sm">Close flag</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h2>Closed flags by fault</h2>
        {byFault.length === 0 ? <p className="muted">None closed yet.</p> : (
          <table className="max-w-md"><tbody>{byFault.map((f) => <tr key={f.fault ?? "none"}><th>{FAULT_LABEL[f.fault ?? ""] ?? "Not classified"}</th><td>{f.n}</td></tr>)}</tbody></table>
        )}
        <ul className="register">
          {recent.map((q) => (
            <li key={q.id} className="register-row">
              <span>{q.question}</span>
              <span className="small muted">{FAULT_LABEL[q.flagFault ?? ""] ?? "Not classified"}{q.flagResolvedAt ? `, closed ${formatDate(q.flagResolvedAt)}` : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
