import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { reportCards, responseRecords } from "@/lib/participation";
import { MIN_RATERS, MIN_RATERS_RANK } from "@/lib/participationRules";
import { FUNCTIONS } from "@/lib/functions";
import { formatDate } from "@/lib/format";
import { stateLabel } from "@/lib/ngTiles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report cards", description: "How residents score Nigerian local governments on the nine functions the Constitution gives them." };

/** Every council residents have scored in the window, comparable only from MIN_RATERS_RANK residents. */
export default async function ReportCards() {
  const [{ rows, months }, records] = await Promise.all([reportCards(), responseRecords()]);
  const responded = new Map(records.map((r) => [r.id, r]));
  const comparable = rows.filter((r) => r.raters >= MIN_RATERS_RANK);
  const building = rows.filter((r) => r.raters < MIN_RATERS_RANK);
  const window = `${formatDate(months[0])} to ${formatDate(months.at(-1)!)}`;
  return (
    <>
      <SiteHeader back="/report-cards" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="Accountability"
          title="Residents' report cards"
          lede={`How residents score their councils on the nine jobs the Constitution gives a local government, 1 to 5, ${window}. A council is compared only from ${MIN_RATERS_RANK} residents, and its card is published from ${MIN_RATERS}, so one person cannot put a council at the top or the bottom.`}
        />
        <div className="wrap py-12 grid gap-14">
          <section className="grid gap-4">
            <h2>Comparable councils</h2>
            {comparable.length === 0 ? (
              <div className="empty measure">
                <p className="font-bold">No council has {MIN_RATERS_RANK} residents&apos; scores yet</p>
                <p style={{ color: "var(--ink-2)" }}>Councils appear here once enough residents have scored them. {rows.length ? `${rows.length} council${rows.length === 1 ? " is" : "s are"} on the way.` : ""} <Link href="/">Find your council</Link> and score it.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Local government</th><th>State</th><th className="num">Residents</th><th className="num">Overall</th>
                      {FUNCTIONS.map((f) => <th key={f.key} className="num" title={f.label}>{f.short}</th>)}
                      <th className="num">Reports answered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparable.map((r) => {
                      const rec = responded.get(r.id);
                      return (
                        <tr key={r.id}>
                          <td><Link href={`/${r.id}/report-card`}>{r.name}</Link></td>
                          <td>{stateLabel(r.state)}</td>
                          <td className="num">{r.raters}</td>
                          <td className="num"><strong>{r.overall != null ? r.overall.toFixed(1) : "–"}</strong></td>
                          {r.perFn.map((f) => <td key={f.key} className="num">{f.avg != null && f.n >= 3 ? f.avg.toFixed(1) : <span className="muted">–</span>}</td>)}
                          <td className="num">{rec ? `${rec.responded}/${rec.total}` : <span className="muted">none filed</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {building.length ? (
            <section className="grid gap-4">
              <h2 style={{ fontSize: "1.4rem" }}>Building up</h2>
              <p className="small muted measure">Councils with some scores but fewer than {MIN_RATERS_RANK} residents. Their overall score is shown only from {MIN_RATERS} residents.</p>
              <ul className="chips">
                {building.map((r) => (
                  <li key={r.id}><Link href={`/${r.id}/report-card`} className="chip">{r.name}, {stateLabel(r.state)} <span className="n">{r.raters} of {MIN_RATERS_RANK}</span></Link></li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="small muted measure">Each function carries equal weight whatever its number of scores, and is shown from 3 scores. Resident scores are opinion; the <Link href="/issues">problem register</Link> records what each council actually answered, and the <Link href="/scoreboard">scoreboard</Link> what it has published. Read them together.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
