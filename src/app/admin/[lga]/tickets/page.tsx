import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { alertChannels } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { updateTicket } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function Tickets({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const tickets = await db.select().from(s.tickets).where(eq(s.tickets.lgaId, lga)).orderBy(desc(s.tickets.createdAt)).limit(200);
  const officers = await db.select({ name: s.staffUsers.name }).from(s.staffUsers).where(and(eq(s.staffUsers.active, true), sql`${s.staffUsers.lgaId} = ${lga} or ${s.staffUsers.lgaId} is null`)).orderBy(asc(s.staffUsers.name));
  const channels = alertChannels();
  const open = tickets.filter((t) => t.status !== "closed");
  return (
    <section className="grid gap-3">
      <h1>Tickets</h1>
      <p className="measure small">Residents who asked to talk to a person. Assign a named officer, call back on the number left, and close the ticket with a note. Residents were given the ticket number to quote.</p>
      <p className="small muted">
        {channels.length ? `New tickets are also sent by ${channels.join(", ")}.` : "No alert channel is configured, so new tickets only appear here. Set ALERT_WEBHOOK_URL, RESEND_API_KEY or TERMII_API_KEY to get SMS, email or webhook alerts."}
        {" "}{open.length} open.
      </p>
      {tickets.length === 0 ? <p className="muted">No tickets yet.</p> : null}
      <ul className="register">
        {tickets.map((t) => (
          <li key={t.id} className="register-row">
            <span className="font-bold">#{t.id} {t.summary}</span>
            <span className="small muted">{formatDate(t.createdAt)}. Contact: {t.contact ?? "none left"}. Status: {t.status}{t.assignedTo ? `, assigned to ${t.assignedTo}` : ""}</span>
            {t.notes ? <span className="small">{t.notes}</span> : null}
            <form action={updateTicket} className="grid gap-2 md:grid-cols-[10rem_14rem_1fr_auto] items-end">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="lgaId" value={lga} />
              <select name="status" defaultValue={t.status} aria-label={`Status of ticket ${t.id}`}>
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
              <input name="assignedTo" list="officers" defaultValue={t.assignedTo ?? ""} placeholder="Officer name" aria-label={`Officer for ticket ${t.id}`} />
              <input name="notes" defaultValue={t.notes ?? ""} placeholder="What was done" aria-label={`Notes for ticket ${t.id}`} />
              <button type="submit" className="btn btn-sm">Save</button>
            </form>
          </li>
        ))}
      </ul>
      <datalist id="officers">{officers.map((o) => <option key={o.name} value={o.name} />)}</datalist>
    </section>
  );
}
