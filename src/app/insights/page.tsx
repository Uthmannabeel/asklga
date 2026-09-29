import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { insights } from "@/lib/national";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "What Nigerians ask their local governments" };

const LANG: Record<string, string> = { en: "English", pcm: "Pidgin", ha: "Hausa", yo: "Yoruba", ig: "Igbo", other: "Other" };

/** The national demand signal: aggregated, anonymised, and only questions asked more than once. */
export default async function Insights() {
  const d = await insights(90);
  const pct = (a: number, b: number) => (Number(b) ? `${Math.round((Number(a) / Number(b)) * 100)}%` : "n/a");
  return (
    <>
      <SiteHeader back="/insights" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="Demand signal"
          title="What Nigerians ask their local governments"
          lede="Questions are stored without personal details, and only questions asked more than once are listed, so no one's individual question appears."
        >
          <dl className="fact-strip">
            <div><dt>Since</dt><dd>{formatDate(d.since)}</dd></div>
            <div><dt>Questions</dt><dd>{Number(d.totals.asked)}</dd></div>
            <div><dt>Local governments asked</dt><dd>{Number(d.totals.lgas)}</dd></div>
            <div><dt>Answered from records</dt><dd>{pct(d.totals.answered, d.totals.asked)}</dd></div>
          </dl>
        </PageHead>
        <div className="wrap py-12 grid gap-10">

        <section className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <h2>By state</h2>
            {d.byState.length === 0 ? <p className="muted">No questions yet.</p> : (
              <table className="data-table"><thead><tr><th>State</th><th className="num">Asked</th><th className="num">Answered</th><th className="num">LGAs</th></tr></thead><tbody>
                {d.byState.map((r) => <tr key={r.state}><td>{r.state}<span className="small muted"> {r.zone}</span></td><td className="num">{r.asked}</td><td className="num">{pct(r.answered, r.asked)}</td><td className="num">{r.lgas}</td></tr>)}
              </tbody></table>
            )}
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <h2>By language</h2>
              <table><tbody>{d.byLanguage.map((r) => <tr key={r.language ?? "none"}><th>{LANG[r.language ?? "other"] ?? r.language}</th><td>{r.asked} asked, {pct(r.answered, r.asked)} answered</td></tr>)}</tbody></table>
            </div>
            <div className="grid gap-2">
              <h2>By audience</h2>
              <table><tbody>{d.byAudience.map((r) => <tr key={r.audience}><th>{r.audience}s</th><td>{r.asked} asked, {pct(r.answered, r.asked)} answered</td></tr>)}</tbody></table>
            </div>
          </div>
        </section>

        <section className="grid gap-2">
          <h2>Most asked and not yet answered</h2>
          <p className="measure small muted">The questions residents repeat that no LGA on the portal has a record for. This is the list a ministry, a state or a civic organisation should work from.</p>
          {d.topUnanswered.length === 0 ? <p className="muted">Nothing repeated yet.</p> : (
            <ol className="list-decimal pl-5 grid gap-1">{d.topUnanswered.map((r, i) => <li key={i}>{r.question} <span className="small muted">({r.n} times, {r.lgas} LGA{Number(r.lgas) === 1 ? "" : "s"})</span></li>)}</ol>
          )}
        </section>

        <p className="small muted measure">Counts refresh live. For the per-LGA view see the <Link href="/scoreboard">scoreboard</Link>; for the data itself see the <Link href="/api/catalogue.json">catalogue</Link>.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
