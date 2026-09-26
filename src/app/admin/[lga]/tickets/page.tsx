import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { updateTicket } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function Tickets({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const tickets = await db.select().from(s.tickets).where(eq(s.tickets.lgaId, lga)).orderBy(desc(s.tickets.createdAt)).limit(200);
  return (
    <section className="grid gap-3">
      <h1>Tickets</h1>
      <p className="measure small">Residents who asked to talk to a person. Assign a named officer, call back on the number left, and close the ticket with a note.</p>
      {tickets.length === 0 ? <p className="muted">No tickets yet.</p> : null}
      <ul className="register">
        {tickets.map((t) => (
          <li key={t.id} className="register-row">
            <span className="font-bold">#{t.id} {t.summary}</span>
            <span className="small muted">{t.createdAt.toISOString().slice(0, 16).replace("T", " ")}. Contact: {t.contact ?? "none left"}. Status: {t.status}{t.assignedTo ? `, assigned to ${t.assignedTo}` : ""}</span>
            {t.notes ? <span className="small">{t.notes}</span> : null}
            <form action={updateTicket} className="grid gap-2 md:grid-cols-[10rem_14rem_1fr_auto] items-end">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="lgaId" value={lga} />
              <select name="status" defaultValue={t.status}>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="closed">Closed</option>
              </select>
              <input name="assignedTo" defaultValue={t.assignedTo ?? ""} placeholder="Officer name" />
              <input name="notes" defaultValue={t.notes ?? ""} placeholder="What was done" />
              <button type="submit" className="btn btn-sm">Save</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
