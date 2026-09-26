import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { updateEnquiry } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function Enquiries({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const db = await getDb();
  const rows = await db.select().from(s.investorEnquiries).where(eq(s.investorEnquiries.lgaId, lga)).orderBy(desc(s.investorEnquiries.createdAt)).limit(200);
  return (
    <section className="grid gap-3">
      <h1>Investor enquiries</h1>
      <p className="measure small">Route each enquiry to the LGA or state office that owns the approval, then record where it went.</p>
      {rows.length === 0 ? <p className="muted">No enquiries yet.</p> : null}
      <ul className="register">
        {rows.map((e) => (
          <li key={e.id} className="register-row">
            <span className="font-bold">#{e.id} {e.sector}{e.organisation ? `, ${e.organisation}` : ""}</span>
            <span>{e.summary}</span>
            <span className="small muted">{e.createdAt.toISOString().slice(0, 10)}. Contact: {e.contact ?? "none"}. Status: {e.status}{e.routedTo ? `, routed to ${e.routedTo}` : ""}</span>
            <form action={updateEnquiry} className="grid gap-2 md:grid-cols-[10rem_1fr_auto] items-end">
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="lgaId" value={lga} />
              <select name="status" defaultValue={e.status}>
                <option value="new">New</option>
                <option value="routed">Routed</option>
                <option value="closed">Closed</option>
              </select>
              <input name="routedTo" defaultValue={e.routedTo ?? ""} placeholder="Office it was sent to" />
              <button type="submit" className="btn btn-sm">Save</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
