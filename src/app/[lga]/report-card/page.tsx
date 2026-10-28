import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { RatingForm } from "@/components/RatingForm";
import { getLga } from "@/lib/queries";
import { issueStats, reportCard } from "@/lib/participation";
import { MIN_FUNCTIONS, MIN_RATERS, MIN_RATERS_RANK, lagosMonth } from "@/lib/participationRules";
import { FUNCTIONS } from "@/lib/functions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report card" };

export default async function ReportCardPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, card, stats] = await Promise.all([getLga(lga), reportCard(lga), issueStats(lga)]);
  if (!row) notFound();
  const month = lagosMonth();
  const window = `${formatDate(card.months[0])} to ${formatDate(card.months.at(-1)!)}`;

  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/report-card`}
      hero={
        <LgaPageHead lgaId={lga} title="Residents' report card" lede={`How residents score ${row.name} on the nine jobs the Constitution gives a council, 1 to 5. Published only once ${MIN_RATERS} residents have scored it in the last three months, so no single voice stands for the whole council.`}>
          <dl className="fact-strip">
            <div><dt>Overall, {window}</dt><dd className="mono">{card.overall != null ? `${card.overall.toFixed(1)} / 5` : <span className="muted" style={{ fontWeight: 400 }}>Not yet published</span>}</dd></div>
            <div><dt>Residents who scored</dt><dd className="mono">{card.raters}{card.published ? "" : ` of ${MIN_RATERS} needed`}</dd></div>
            <div><dt>Problems reported</dt><dd className="mono">{stats.total}</dd></div>
            <div><dt>Council responded to</dt><dd className="mono">{stats.total ? `${stats.responded} of ${stats.total}` : "none filed"}</dd></div>
          </dl>
        </LgaPageHead>
      }
    >
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-14 items-start">
        <div className="grid gap-5">
          <h2 style={{ fontSize: "1.4rem" }}>By function</h2>
          {card.published ? (
            <ol className="score-list">
              {card.perFn.map((f) => {
                const def = FUNCTIONS.find((x) => x.key === f.key)!;
                const shown = f.avg != null && f.n >= 3;
                return (
                  <li key={f.key} className="score-row">
                    <span className="grid gap-0.5">
                      <span className="font-bold">{def.label}</span>
                      <span className="small muted">{f.n} score{f.n === 1 ? "" : "s"}{shown ? "" : f.n ? ", shown from 3" : ""}</span>
                    </span>
                    <span className={`score-bar${shown && (f.avg as number) < 2.5 ? " is-low" : ""}`} aria-hidden="true">{shown ? <span style={{ width: `${((f.avg as number) / 5) * 100}%` }} /> : null}</span>
                    <span className="score-n">{shown ? (f.avg as number).toFixed(1) : <span className="muted" style={{ fontWeight: 400 }}>–</span>}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="empty">
              <p className="font-bold">{card.raters === 0 ? `Nobody has scored ${row.name} yet` : `${card.raters} resident${card.raters === 1 ? " has" : "s have"} scored ${row.name} in the last three months`}</p>
              <p style={{ color: "var(--ink-2)" }}>The card is published at {MIN_RATERS} residents. Until then nothing is shown, so a council cannot be ranked first or last on one person&apos;s say.</p>
            </div>
          )}
          <div className="grid gap-2 small measure" style={{ color: "var(--ink-2)" }}>
            <p className="eyebrow">How this is kept honest</p>
            <p>One score per email address per month, matched by a one-way hash; the address itself is never stored. Scores from the last three months count. Each function carries equal weight and is shown from 3 scores. A council joins the <Link href="/report-cards">national comparison</Link> only from {MIN_RATERS_RANK} residents. The problem register beside it is the harder evidence: it records whether the council answered, and how fast.</p>
            <p>Resident scores are opinion, not an audit. They sit next to the records, the money and the measured answer accuracy so each can be read against the others.</p>
          </div>
        </div>
        <aside className="panel grid gap-4 content-start" id="score">
          <h2 style={{ fontSize: "1.3rem" }}>Score {row.name} for {formatDate(month)}</h2>
          <RatingForm lgaId={lga} lgaName={row.name} month={formatDate(month)} minFunctions={MIN_FUNCTIONS} minRaters={MIN_RATERS} />
        </aside>
      </section>
    </LgaShell>
  );
}
