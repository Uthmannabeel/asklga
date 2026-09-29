import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { PageHead } from "@/components/PageHead";
import { BarChart } from "@/components/BarChart";
import { getLga } from "@/lib/queries";
import { ledger, naira, nairaShort, periodLabel, rankFor, totalOnFile } from "@/lib/money";
import { ordinal, pct } from "@/lib/format";
import { stateLabel, stateSlug } from "@/lib/ngTiles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  return { title: row ? `Federation allocations to ${row.name} LGA` : "Money" };
}

/**
 * "Your LGA's money": every published monthly Federation Account (FAAC) allocation to this
 * LGA. Since the 2024 Supreme Court judgment on local government financial autonomy this is the
 * most-asked number about any LGA and the hardest to find.
 */
export default async function MoneyPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, rows, total] = await Promise.all([getLga(lga), ledger(lga), totalOnFile(lga)]);
  if (!row) notFound();
  const latest = rows.at(-1) ?? null;
  const rank = latest ? await rankFor(lga, row.state, latest.period) : null;
  const newestFirst = [...rows].reverse();
  const hasDeductions = rows.some((r) => r.deductionsNgn != null);
  const hasGross = rows.some((r) => r.grossNgn != null);
  const byYear = new Map<string, number>();
  for (const r of rows) byYear.set(r.period.slice(0, 4), (byYear.get(r.period.slice(0, 4)) ?? 0) + (r.value ?? 0));

  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/money`}
      hero={
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }, { href: `/state/${stateSlug(row.state)}`, label: stateLabel(row.state) }, { href: `/${lga}`, label: row.name }]}
          eyebrow="Federation Account (FAAC)"
          title={`Money allocated to ${row.name}`}
          lede="Every month the Federation Account Allocation Committee shares federal revenue among the federal government, the states and all 774 local governments. These are the published figures for this council, so residents can set them beside what they see on the ground."
        >
          {latest ? (
            <dl className="fact-strip">
              <div><dt>{periodLabel(latest.period, true)}</dt><dd className="mono">{naira(latest.value)}</dd></div>
              <div><dt>Change on previous month</dt><dd className={`mono delta ${latest.change != null && latest.change < 0 ? "down" : "up"}`}>{latest.change != null ? pct(latest.change) : "Not available"}</dd></div>
              <div><dt>Total on file, {total.months} months</dt><dd className="mono">{nairaShort(total.total)}</dd></div>
              {rank && rank.stateOf > 1 ? <div><dt>Rank in {stateLabel(row.state)}</dt><dd>{ordinal(rank.state)} of {rank.stateOf}</dd></div> : null}
              {row.population && latest.value ? <div><dt>Per resident, latest month</dt><dd className="mono">{naira(latest.value / row.population)}</dd></div> : null}
            </dl>
          ) : null}
        </PageHead>
      }
    >
      {rows.length === 0 ? (
        <section className="empty measure">
          <p className="font-bold">No allocation months loaded for {row.name} yet</p>
          <p style={{ color: "var(--ink-2)" }}>Figures are imported from the published monthly FAAC tables, each row with its source. When they are, this page shows a monthly chart, the full ledger and how {row.name} compares with the rest of {stateLabel(row.state)}.</p>
          <p className="small"><Link href="/money">See allocations across Nigeria</Link></p>
        </section>
      ) : (
        <>
          <section className="grid gap-3" aria-labelledby="chart-h">
            <h2 id="chart-h">Month by month</h2>
            <BarChart data={rows.slice(-36).map((r) => ({ label: periodLabel(r.period), value: r.value }))} format={naira} label={`Monthly allocation to ${row.name}`} height={220} />
            {byYear.size > 1 ? (
              <p className="small muted">
                {[...byYear.entries()].map(([y, v]) => `${y}: ${nairaShort(v)}`).join(" · ")}
              </p>
            ) : null}
          </section>

          <section className="grid gap-3" aria-labelledby="ledger-h">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="ledger-h">Ledger</h2>
              <a href={`/api/${lga}/open/allocations.csv`} className="small">Download CSV</a>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    {hasGross ? <th className="num">Gross</th> : null}
                    {hasDeductions ? <th className="num">Deductions</th> : null}
                    <th className="num">{rows.some((r) => r.netNgn != null) ? "Net paid" : "Allocation"}</th>
                    <th className="num">Change</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {newestFirst.map((r) => (
                    <tr key={r.period}>
                      <td>{periodLabel(r.period, true)}</td>
                      {hasGross ? <td className="num">{naira(r.grossNgn)}</td> : null}
                      {hasDeductions ? <td className="num">{naira(r.deductionsNgn)}</td> : null}
                      <td className="num"><strong>{naira(r.netNgn ?? r.grossNgn)}</strong></td>
                      <td className={`num ${r.change == null ? "" : r.change >= 0 ? "up" : "down"}`}>{r.change == null ? "" : pct(r.change)}</td>
                      <td className="small">{r.sourceUrl ? <a href={r.sourceUrl} rel="noopener" style={{ fontWeight: 400 }}>{r.source}</a> : r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted measure">
              Gross is the council&apos;s share before deductions; net is the amount paid after statutory deductions. Figures are as published. Change, totals and ranks are calculated from them. <Link href="/standard#allocations">Field definitions</Link>
            </p>
          </section>
        </>
      )}

      <section className="grid gap-3 md:grid-cols-2 md:gap-10" style={{ borderTop: "1px solid var(--rule)", paddingTop: "2rem" }}>
        <div className="grid gap-2 content-start">
          <h2 style={{ fontSize: "1.3rem" }}>What this money is for</h2>
          <p style={{ color: "var(--ink-2)" }}>Local governments fund primary health centres, primary schools, markets, rural roads, drainage, waste collection and civil registration from this allocation and their own revenue.</p>
          <p className="small"><Link href={`/${lga}/projects`}>See what {row.name} has published about its projects</Link></p>
        </div>
        <div className="grid gap-2 content-start">
          <h2 style={{ fontSize: "1.3rem" }}>Compare</h2>
          <p style={{ color: "var(--ink-2)" }}>See how {row.name} sits beside every other council in {stateLabel(row.state)} and across the country.</p>
          <p className="small flex flex-wrap gap-x-4"><Link href={`/state/${stateSlug(row.state)}`}>{stateLabel(row.state)}</Link><Link href="/money">All of Nigeria</Link><Link href={`/compare?lgas=${lga}`}>Compare side by side</Link></p>
        </div>
      </section>
    </LgaShell>
  );
}
