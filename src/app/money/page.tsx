import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { BarChart } from "@/components/BarChart";
import { month, monthlySeries, nationalSeries, naira, nairaShort, periodLabel, periods, type MonthRow } from "@/lib/money";
import { stateLabel, stateSlug } from "@/lib/ngTiles";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Federation allocations to all 774 local governments",
  description: "Monthly FAAC allocations to every local government area in Nigeria: highest and lowest, per resident, by state, with the published source for every figure.",
};

const VIEWS = {
  all: "All LGAs",
  highest: "Highest",
  lowest: "Lowest",
  "per-resident-high": "Most per resident",
  "per-resident-low": "Least per resident",
} as const;
type View = keyof typeof VIEWS;

export default async function NationalMoney({ searchParams }: { searchParams: Promise<{ period?: string; view?: string; state?: string; show?: string }> }) {
  const sp = await searchParams;
  const all = await periods();
  const period = sp.period && all.includes(sp.period) ? sp.period : all[0];
  const view: View = sp.view && sp.view in VIEWS ? (sp.view as View) : "all";
  const [rows, series] = period ? await Promise.all([month(period), nationalSeries(36)]) : [[] as MonthRow[], []];
  const total = rows.reduce((n, r) => n + r.value, 0);
  const fullCount = Math.max(0, ...series.map((r) => r.lgas));
  const states = [...new Set(rows.map((r) => r.state))].sort();
  const stateFilter = sp.state && states.includes(sp.state) ? sp.state : undefined;
  const scoped = stateFilter ? rows.filter((r) => r.state === stateFilter) : rows;
  const withHead = scoped.filter((r) => r.perHead != null);
  const shown =
    view === "highest" ? scoped.slice(0, 20)
    : view === "lowest" ? [...scoped].reverse().slice(0, 20)
    : view === "per-resident-high" ? [...withHead].sort((a, b) => b.perHead! - a.perHead!).slice(0, 20)
    : view === "per-resident-low" ? [...withHead].sort((a, b) => a.perHead! - b.perHead!).slice(0, 20)
    : sp.show === "all" || stateFilter ? scoped : scoped.slice(0, 50);
  const truncated = view === "all" && !stateFilter && sp.show !== "all" && scoped.length > 50;
  const byState = states
    .map((st) => {
      const r = rows.filter((x) => x.state === st);
      return { state: st, lgas: r.length, total: r.reduce((n, x) => n + x.value, 0) };
    })
    .sort((a, b) => b.total - a.total);
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { period, view, state: stateFilter, ...o };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "view" && v === "all")) p.set(k, v);
    return `/money?${p.toString()}#table`;
  };

  return (
    <>
      <SiteHeader back="/money" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="Federation Account (FAAC)"
          title="Money allocated to local governments"
          lede="What each of Nigeria's local governments received from the Federation Account, month by month, exactly as published. Rank them, compare them per resident, or open any council's full ledger."
        >
          {period ? (
            <dl className="fact-strip">
              <div><dt>Month</dt><dd>{periodLabel(period, true)}</dd></div>
              <div><dt>Total to {rows.length} LGAs</dt><dd className="mono">{nairaShort(total)}</dd></div>
              <div><dt>Average per LGA</dt><dd className="mono">{nairaShort(rows.length ? total / rows.length : 0)}</dd></div>
              <div><dt>Months on file</dt><dd>{all.length}{all.length ? <span className="muted" style={{ fontWeight: 400 }}> · {periodLabel(all.at(-1)!, true)} to {periodLabel(all[0], true)}</span> : null}</dd></div>
            </dl>
          ) : null}
        </PageHead>

        <div className="wrap py-10 grid gap-12">
          {!period ? (
            <section className="empty measure">
              <p className="font-bold">No allocation months loaded yet</p>
              <p style={{ color: "var(--ink-2)" }}>Monthly figures are imported from the published FAAC tables, each row with its source. When they are, this page ranks all 774 councils and shows totals by state.</p>
            </section>
          ) : (
            <>
              {series.length > 1 ? (
                <section className="grid gap-3">
                  <h2>Total to all local governments, by month</h2>
                  <BarChart data={monthlySeries(series, (r) => r.total)} format={naira} label="Monthly FAAC allocation to all local governments" height={200} />
                  {series.some((r) => r.lgas < fullCount) ? (
                    <p className="small muted measure">
                      {series.filter((r) => r.lgas < fullCount).map((r) => `${periodLabel(r.period, true)} covers ${r.lgas} councils`).join("; ")}. Those months leave out states whose published council rows do not add up to the official state summary, so their totals are lower than what was shared. Gaps are months not published. <Link href="/about#sources">Sources</Link>
                    </p>
                  ) : null}
                </section>
              ) : null}

              <section id="table" className="grid gap-4" style={{ scrollMarginTop: "1rem" }}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="grid gap-1">
                    <h2>{truncated ? "Top 50 LGAs" : VIEWS[view]}{stateFilter ? `, ${stateLabel(stateFilter)}` : ""}, {periodLabel(period, true)}</h2>
                    {rows.length < fullCount ? <p className="small muted">This month covers {rows.length} councils; states whose published council rows do not add up to the official state summary are left out.</p> : null}
                  </div>
                  <form method="get" action="/money" className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="view" value={view} />
                    <label className="grid gap-1 small">Month
                      <select name="period" defaultValue={period}>{all.map((p) => <option key={p} value={p}>{periodLabel(p, true)}</option>)}</select>
                    </label>
                    <label className="grid gap-1 small">State
                      <select name="state" defaultValue={stateFilter ?? ""}><option value="">All states</option>{states.map((s) => <option key={s} value={s}>{stateLabel(s)}</option>)}</select>
                    </label>
                    <button className="btn btn-sm" type="submit">Show</button>
                  </form>
                </div>
                <nav aria-label="Ranking" className="chips">
                  {(Object.keys(VIEWS) as View[]).map((v) => (
                    <Link key={v} href={q({ view: v })} scroll={false} className="chip" aria-current={v === view ? "page" : undefined}>{VIEWS[v]}</Link>
                  ))}
                </nav>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="num">#</th>
                        <th>Local government</th>
                        <th>State</th>
                        <th className="num">{rows.some((r) => r.netNgn != null) ? "Net paid" : "Allocation"}</th>
                        <th className="num">Per resident (2006 census)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r, i) => (
                        <tr key={r.id}>
                          <td className="num muted">{i + 1}</td>
                          <td><Link href={`/${r.id}/money`}>{r.name}</Link></td>
                          <td><Link href={`/state/${stateSlug(r.state)}`} style={{ fontWeight: 400, color: "var(--ink-2)" }}>{r.state}</Link></td>
                          <td className="num">{naira(r.value)}</td>
                          <td className="num">{r.perHead != null ? naira(r.perHead) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {truncated ? <p><Link href={`${q({}).replace("#table", "")}&show=all#table`} scroll={false} className="btn btn-quiet btn-sm">Show all {scoped.length} councils</Link></p> : null}
                <p className="small muted measure">Per resident divides the month&apos;s allocation by the 2006 census population. It shows relative weight, not what is spent on each person. Kogi and Lokoja are not listed yet: the published tables name these two councils in a way that cannot be matched to them with certainty.</p>
              </section>

              <section className="grid gap-3">
                <h2>By state</h2>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead><tr><th>State</th><th className="num">LGAs</th><th className="num">Total, {periodLabel(period)}</th><th className="num">Average per LGA</th></tr></thead>
                    <tbody>
                      {byState.map((s) => (
                        <tr key={s.state}>
                          <td><Link href={`/state/${stateSlug(s.state)}`}>{stateLabel(s.state)}</Link></td>
                          <td className="num">{s.lgas}</td>
                          <td className="num">{naira(s.total)}</td>
                          <td className="num">{naira(s.total / s.lgas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
