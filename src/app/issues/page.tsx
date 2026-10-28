import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { IssueStatusMark } from "@/components/IssueStatus";
import { recentIssues, responseRecords } from "@/lib/participation";
import { daysOpen } from "@/lib/participationRules";
import { fnLabel } from "@/lib/functions";
import { formatDate } from "@/lib/format";
import { stateLabel } from "@/lib/ngTiles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Problems reported", description: "Problems residents have reported to Nigerian local governments, with how fast each council responded." };

/** National feed of resident reports and the response record of every council that has received one. */
export default async function NationalIssues() {
  const [feed, records] = await Promise.all([recentIssues(60), responseRecords()]);
  const totals = records.reduce((a, r) => ({ total: a.total + r.total, responded: a.responded + r.responded, resolved: a.resolved + r.resolved }), { total: 0, responded: 0, resolved: 0 });
  return (
    <>
      <SiteHeader back="/issues" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="Accountability"
          title="Problems reported to councils"
          lede="What residents have reported to their local governments, and whether the council answered. A report is public from the moment it is filed; the clock on the council's response starts the same day."
        >
          {totals.total ? (
            <dl className="fact-strip">
              <div><dt>Reports</dt><dd>{totals.total}</dd></div>
              <div><dt>Councils reported to</dt><dd>{records.length}</dd></div>
              <div><dt>Responded to</dt><dd>{totals.responded}</dd></div>
              <div><dt>Resolved</dt><dd>{totals.resolved}</dd></div>
            </dl>
          ) : null}
        </PageHead>
        <div className="wrap py-12 grid gap-14">
          <section className="grid gap-4">
            <h2>Council response record</h2>
            {records.length === 0 ? <p className="muted">No council has received a report yet. <Link href="/">Find your council</Link> and file the first.</p> : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr><th>Local government</th><th>State</th><th className="num">Reports</th><th className="num">Open</th><th className="num">Responded</th><th className="num">Median days to respond</th><th className="num">Resolved</th><th className="num">Waiting 14+ days</th></tr></thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td><Link href={`/${r.id}/issues`}>{r.name}</Link></td>
                        <td>{stateLabel(r.state)}</td>
                        <td className="num">{r.total}</td>
                        <td className="num">{r.open}</td>
                        <td className="num">{r.responded} <span className="muted">({r.total ? Math.round((r.responded / r.total) * 100) : 0}%)</span></td>
                        <td className="num">{r.medianDaysToResponse != null ? r.medianDaysToResponse : <span className="muted">none yet</span>}</td>
                        <td className="num">{r.resolved}</td>
                        <td className={`num${r.overdue ? " down" : ""}`}>{r.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small muted measure">&quot;Responded&quot; means a council officer changed the status or wrote a reply on the public page. A report the council marks as not its responsibility still counts as responded, because the resident has been told whose it is. Councils are listed by number of reports, not ranked by score.</p>
          </section>

          <section className="grid gap-4">
            <h2>Latest reports</h2>
            {feed.length === 0 ? <p className="muted">Nothing filed yet.</p> : (
              <ol className="register">
                {feed.map((i) => (
                  <li key={i.id} className="register-row md:grid-cols-[minmax(0,1fr)_9rem] md:gap-x-8">
                    <div className="grid gap-1">
                      <Link href={`/${i.lgaId}/issues/${i.id}`} className="record-title">{i.title}</Link>
                      <span className="small" style={{ color: "var(--ink-2)" }}><IssueStatusMark status={i.status} /> {i.lgaName}, {stateLabel(i.state)} · {fnLabel(i.fn, true)}</span>
                      <span className="small muted">{formatDate(i.createdAt)}{i.supports ? ` · affects ${i.supports} other${i.supports === 1 ? "" : "s"}` : ""}</span>
                    </div>
                    <div className="md:text-right grid content-start gap-0.5">
                      <span className="mono font-bold">{daysOpen(i.createdAt, i.resolvedAt)} days</span>
                      <span className="small muted">{i.respondedAt ? "responded" : "no response yet"}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
