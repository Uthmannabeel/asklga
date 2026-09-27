import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { currentStaff } from "@/lib/auth";
import { importAllocations } from "../actions";

export const dynamic = "force-dynamic";

/** National import of Federation Account allocations from the published monthly table, as CSV. */
export default async function AllocationsAdmin({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await currentStaff();
  if (!me) redirect("/admin");
  if (me.role !== "admin") redirect("/admin?error=role");
  const { error, ok } = await searchParams;
  const db = await getDb();
  const periods = await db
    .select({ period: s.allocations.period, lgas: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${s.allocations.netNgn}), 0)` })
    .from(s.allocations)
    .groupBy(s.allocations.period)
    .orderBy(desc(s.allocations.period))
    .limit(36);
  return (
    <>
      <section className="grid gap-3 measure">
        <h1>Federation allocations</h1>
        <p className="small">
          Upload the published monthly table as CSV with the columns <code>state, lga, period, gross_ngn, net_ngn</code> (period as YYYY-MM, amounts in whole naira, no commas), plus the source name and link below. Rows are matched to LGAs by state and name; unmatched rows are reported and skipped, matched rows replace any existing row for that LGA and month. {me.lgaId ? "Your account is bound to one LGA, so only rows for that LGA are imported." : ""}
        </p>
        <p className="small"><a href="/allocations-template.csv" download>Download the CSV template</a></p>
        {error ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{decodeURIComponent(error)}</p> : null}
        {ok ? <p className="small" role="status">{decodeURIComponent(ok)}</p> : null}
        <form action={importAllocations} className="grid gap-3" encType="multipart/form-data">
          <div className="grid gap-1"><label htmlFor="file" className="small">CSV file</label><input id="file" name="file" type="file" accept=".csv,text/csv" required /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1"><label htmlFor="source" className="small">Source (as it should appear on the page)</label><input id="source" name="source" required placeholder="e.g. FAAC disbursement table, Office of the Accountant-General, March 2026" /></div>
            <div className="grid gap-1"><label htmlFor="sourceUrl" className="small">Source link</label><input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://" /></div>
          </div>
          <div><button type="submit" className="btn">Import</button></div>
        </form>
      </section>
      <section className="grid gap-2">
        <h2>Months on file</h2>
        {periods.length === 0 ? <p className="muted">Nothing imported yet.</p> : (
          <table className="max-w-xl"><thead><tr><th>Month</th><th>LGAs</th><th>Total net</th></tr></thead><tbody>
            {periods.map((p) => <tr key={p.period}><td>{p.period}</td><td>{p.lgas}</td><td>N{Number(p.total).toLocaleString("en-NG")}</td></tr>)}
          </tbody></table>
        )}
      </section>
    </>
  );
}
