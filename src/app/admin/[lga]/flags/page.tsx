import { and, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { resolveFlag } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function Flags({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const open = await db.select().from(s.questions).where(and(eq(s.questions.lgaId, lga), eq(s.questions.flagged, true), eq(s.questions.flagResolved, false))).orderBy(desc(s.questions.createdAt)).limit(200);
  return (
    <section className="grid gap-3">
      <h1>Flagged answers</h1>
      <p className="measure small">Answers a resident or a staff member reported as wrong. Decide whether the record, the retrieval or the wording was at fault, fix it, and log what you did.</p>
      {open.length === 0 ? <p className="muted">No open flags.</p> : null}
      <ul className="register">
        {open.map((q) => (
          <li key={q.id} className="register-row">
            <span className="font-bold">{q.question}</span>
            <span className="answer" style={{ fontSize: "1rem" }}>{q.answer}</span>
            <span className="small muted">Cited: {q.citations.map((c) => c.id).join(", ") || "nothing"}. Flag: {q.flagNote}</span>
            <form action={resolveFlag} className="flex flex-wrap gap-2 items-center">
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="lgaId" value={lga} />
              <input name="resolution" placeholder="What was wrong and what was fixed" style={{ maxWidth: "28rem" }} required />
              <button type="submit" className="btn btn-sm">Close flag</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
