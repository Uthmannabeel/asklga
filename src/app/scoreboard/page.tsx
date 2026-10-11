import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
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
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="Accountability"
          title="Scoreboard"
          lede="Every council that has published records or received questions, with what can be measured about it. Accuracy is the share of a fixed, published set of test questions the answer service got right against that council's records. The server scores each run itself from the answers it gave, and every run can be inspected case by case."
        />
        <div className="wrap py-12 grid gap-6">
        {rows.length === 0 ? <p className="muted">No LGA has published records yet.</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Local government</th><th>State</th><th className="num">Published records</th><th className="num">Questions, 30 days</th><th className="num">Answered</th><th className="num">Open gaps</th><th>Test-set accuracy</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/${r.id}`}>{r.name}</Link>{r.demo ? <span className="small muted"> (demo)</span> : null}</td>
                    <td>{r.state}</td>
                    <td className="num">{r.records}</td>
                    <td className="num">{r.asked30}</td>
                    <td className="num">{pct(r.answered30, r.asked30)}</td>
                    <td className="num">{r.openGaps}</td>
                    <td>{r.accuracy != null ? <>{r.accuracy}% <span className="small muted">({r.evalCases} cases, {r.evalAt ? formatDate(r.evalAt) : ""}, {r.evalVerified ? "scored by the server" : "staff-reported"}{r.evalRun ? <>, <a href={`/api/eval-result?run=${r.evalRun}`}>case by case</a></> : null})</span></> : <span className="muted">not yet run</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted measure">&quot;Answered&quot; means answered from published records; a refusal is counted as not answered even when refusing was correct. Open gaps are distinct questions the LGA has not yet added a record for. Demo LGAs carry illustrative records and are marked. Records compiled from public sources are labelled on the council&apos;s pages until the council confirms them. &quot;Staff-reported&quot; runs predate server scoring and carry only the totals staff submitted. The test set is <a href="https://github.com/Uthmannabeel/asklga/blob/main/eval/questions.json" rel="noopener">eval/questions.json</a>; a run is only as broad as that set. <Link href="/about-answers">How answers are checked</Link></p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
