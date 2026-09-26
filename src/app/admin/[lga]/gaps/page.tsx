import { and, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { resolveGap } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function Gaps({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const open = await db.select().from(s.questions).where(and(eq(s.questions.lgaId, lga), eq(s.questions.gapStatus, "open"))).orderBy(desc(s.questions.createdAt)).limit(200);
  const resolved = await db.select().from(s.questions).where(and(eq(s.questions.lgaId, lga), eq(s.questions.gapStatus, "resolved"))).orderBy(desc(s.questions.createdAt)).limit(30);
  return (
    <>
      <section className="grid gap-3">
        <h1>Data gaps</h1>
        <p className="measure small">Every question the records could not answer. Add the missing record, then mark the gap resolved and say which record now answers it.</p>
        {open.length === 0 ? <p className="muted">No open gaps.</p> : null}
        <ul className="register">
          {open.map((q) => (
            <li key={q.id} className="register-row">
              <span>{q.question}</span>
              <span className="small muted">{q.createdAt.toISOString().slice(0, 10)}, {q.language}, {q.audience}. {q.gapResolution ? `Asked for: ${q.gapResolution}` : ""}</span>
              <form action={resolveGap} className="flex flex-wrap gap-2 items-center">
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="lgaId" value={lga} />
                <input name="resolution" placeholder="Which record answers it now, e.g. OBA-S-0013" style={{ maxWidth: "24rem" }} />
                <button type="submit" className="btn btn-sm">Mark resolved</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h2>Recently resolved</h2>
        <ul className="register">
          {resolved.map((q) => (
            <li key={q.id} className="register-row">
              <span>{q.question}</span>
              <span className="small muted">{q.gapResolution ?? "resolved"}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
