import { and, desc, eq, ne } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getLga, listDocuments, listProjects, topQuestions } from "@/lib/queries";
import { formatNaira } from "@/lib/register";
import { statusLabel } from "@/components/StatusMark";

export const dynamic = "force-dynamic";

/** Handover pack for a change of administration: the state of every project, open tickets, key documents, top questions. Printable. */
export default async function Handover({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const [row, projects, docs, top] = await Promise.all([getLga(lga), listProjects(lga, { approvedOnly: false }), listDocuments(lga, "internal", false), topQuestions(lga, 15)]);
  const tickets = await db.select().from(s.tickets).where(and(eq(s.tickets.lgaId, lga), ne(s.tickets.status, "closed"))).orderBy(desc(s.tickets.createdAt));
  const groups = ["ongoing", "stalled", "abandoned", "unknown", "planned", "completed"];
  return (
    <section className="grid gap-5 measure">
      <h1>Handover pack, {row?.name} LGA</h1>
      <p className="small muted">Generated {new Date().toISOString().slice(0, 10)}. Everything an incoming administration needs on day one, from the records as they stand.</p>

      <h2>Projects by status</h2>
      {groups.map((g) => {
        const list = projects.filter((p) => p.status === g);
        if (!list.length) return null;
        return (
          <div key={g} className="grid gap-1">
            <h3>{statusLabel(g)} ({list.length})</h3>
            <ul className="list-disc pl-5">
              {list.map((p) => (
                <li key={p.id}>
                  {p.id} {p.name}. {p.sponsor}, {formatNaira(p.amountNgn)}{p.statusNote ? `. ${p.statusNote}` : ""}. Last verified {p.lastVerified ?? "never"}.
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <h2>Open tickets ({tickets.length})</h2>
      {tickets.length === 0 ? <p className="muted">None.</p> : <ul className="list-disc pl-5">{tickets.map((t) => <li key={t.id}>#{t.id} {t.summary} ({t.status}{t.assignedTo ? `, ${t.assignedTo}` : ""})</li>)}</ul>}

      <h2>Key documents ({docs.length})</h2>
      <ul className="list-disc pl-5">{docs.map((d) => <li key={d.id}>{d.id} {d.title} ({d.kind}, {d.visibility}, {d.approval})</li>)}</ul>

      <h2>What residents ask most</h2>
      <ol className="list-decimal pl-5">{top.map((t) => <li key={t.question}>{t.question} ({t.n})</li>)}</ol>
    </section>
  );
}
