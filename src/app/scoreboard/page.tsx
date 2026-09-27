import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { scoreboard } from "@/lib/national";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scoreboard" };

/** Published, per-LGA: how much is on the record, how well questions get answered, and the measured accuracy of the answer service. */
export default async function Scoreboard() {
  const rows = await scoreboard();
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");
  return (
    <>
      <SiteHeader back="/scoreboard" />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 grid gap-6">
        <section className="measure grid gap-3">
          <h1>Scoreboard</h1>
          <p>Every LGA that has published records or received questions, with what can be measured about it. Accuracy is the share of a fixed set of test questions the answer service got right against that LGA&apos;s records, re-run after changes; <Link href="/about-answers">how answers are checked</Link>.</p>
        </section>
        {rows.length === 0 ? <p className="muted">No LGA has published records yet.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>LGA</th><th>State</th><th>Approved records</th><th>Questions, 30 days</th><th>Answered</th><th>Open gaps</th><th>Measured accuracy</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/${r.id}`}>{r.name}</Link>{r.demo ? <span className="small muted"> (demo)</span> : null}</td>
                    <td>{r.state}</td>
                    <td>{r.records}</td>
                    <td>{r.asked30}</td>
                    <td>{pct(r.answered30, r.asked30)}</td>
                    <td>{r.openGaps}</td>
                    <td>{r.accuracy != null ? <>{r.accuracy}% <span className="small muted">({r.evalCases} cases, {r.evalAt ? formatDate(r.evalAt) : ""})</span></> : <span className="muted">not yet run</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted measure">&quot;Answered&quot; means answered from approved records; a refusal is counted as not answered even when refusing was correct. Open gaps are distinct questions the LGA has not yet added a record for. Demo LGAs carry illustrative records and are marked.</p>
      </main>
    </>
  );
}
