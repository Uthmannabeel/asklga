import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { BarChart } from "@/components/BarChart";
import { getLga } from "@/lib/queries";
import { directory, lgaRecordCount } from "@/lib/national";
import { ledger, naira, nairaShort, periodLabel } from "@/lib/money";
import { stateLabel, stateSlug } from "@/lib/ngTiles";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Compare local governments",
  description: "Put up to four Nigerian local government areas side by side: population, land area, federation allocations and published records.",
};

const MAX = 4;

export default async function Compare({ searchParams }: { searchParams: Promise<{ lgas?: string; add?: string; remove?: string }> }) {
  const sp = await searchParams;
  const dir = await directory();
  const valid = new Set(dir.map((d) => d.id));
  let ids = (sp.lgas ?? "").split(",").map((x) => x.trim()).filter((x) => valid.has(x));
  if (sp.add && valid.has(sp.add) && !ids.includes(sp.add)) ids.push(sp.add);
  if (sp.remove) ids = ids.filter((x) => x !== sp.remove);
  ids = [...new Set(ids)].slice(0, MAX);

  const items = await Promise.all(
    ids.map(async (id) => {
      const [row, money, records] = await Promise.all([getLga(id), ledger(id), lgaRecordCount(id)]);
      const last = money.at(-1) ?? null;
      const last12 = money.slice(-12);
      return { row: row!, money, records, last, total12: last12.reduce((n, r) => n + (r.value ?? 0), 0), months12: last12.length };
    }),
  );
  const states = [...new Set(dir.map((d) => d.state))].sort();
  const list = ids.join(",");
  const link = (next: string[]) => (next.length ? `/compare?lgas=${next.join(",")}` : "/compare");

  const rowsDef: { label: string; cell: (i: (typeof items)[number]) => React.ReactNode }[] = [
    { label: "State", cell: (i) => <Link href={`/state/${stateSlug(i.row.state)}`} style={{ fontWeight: 400 }}>{stateLabel(i.row.state)}</Link> },
    { label: "Headquarters", cell: (i) => i.row.headquarters ?? <span className="muted">Not on file</span> },
    { label: "Population", cell: (i) => (i.row.population ? <span className="mono">{i.row.population.toLocaleString("en-NG")}{i.row.populationYear ? <span className="muted"> ({i.row.populationYear})</span> : null}</span> : <span className="muted">Not on file</span>) },
    { label: "Land area", cell: (i) => (i.row.areaKm2 ? <span className="mono">{Math.round(i.row.areaKm2).toLocaleString("en-NG")} km²</span> : <span className="muted">Not on file</span>) },
    { label: "People per km²", cell: (i) => (i.row.population && i.row.areaKm2 ? <span className="mono">{Math.round(i.row.population / i.row.areaKm2).toLocaleString("en-NG")}</span> : <span className="muted">Not available</span>) },
    { label: "Latest allocation", cell: (i) => (i.last ? <span className="mono">{naira(i.last.value)}<br /><span className="muted small">{periodLabel(i.last.period, true)}</span></span> : <span className="muted">Not loaded</span>) },
    { label: "Last 12 months", cell: (i) => (i.months12 ? <span className="mono">{nairaShort(i.total12)}{i.months12 < 12 ? <span className="muted small"> ({i.months12} months)</span> : null}</span> : <span className="muted">Not loaded</span>) },
    { label: "Per resident, latest month", cell: (i) => (i.last?.value && i.row.population ? <span className="mono">{naira(i.last.value / i.row.population)}</span> : <span className="muted">Not available</span>) },
    { label: "Approved council records", cell: (i) => (i.records ? <strong>{i.records}</strong> : <span className="muted">Not joined yet</span>) },
  ];

  return (
    <>
      <SiteHeader back={`/compare${list ? `?lgas=${list}` : ""}`} />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          title="Compare local governments"
          lede={`Put up to ${MAX} local government areas side by side. Every figure links back to the council's own page and its source.`}
        />
        <div className="wrap py-10 grid gap-10">
          <form method="get" action="/compare" className="flex flex-wrap items-end gap-3 panel" style={{ padding: "1.25rem" }}>
            <input type="hidden" name="lgas" value={list} />
            <label className="grid gap-1 font-bold" style={{ flex: "1 1 18rem" }}>
              Add a local government
              <select name="add" defaultValue="" required disabled={ids.length >= MAX}>
                <option value="" disabled>Choose an LGA</option>
                {states.map((st) => (
                  <optgroup key={st} label={stateLabel(st)}>
                    {dir.filter((d) => d.state === st && !ids.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <button className="btn" type="submit" disabled={ids.length >= MAX}>Add to comparison</button>
            {ids.length >= MAX ? <p className="small muted w-full">Four is the most that fit side by side. Remove one to add another.</p> : null}
          </form>

          {items.length === 0 ? (
            <section className="empty measure">
              <p className="font-bold">Choose the first local government to compare</p>
              <p style={{ color: "var(--ink-2)" }}>Pick one above, then add up to three more. Useful pairings: neighbouring councils, councils of a similar size, or your LGA against the largest in your state.</p>
            </section>
          ) : (
            <section className="table-scroll">
              <table className="data-table" style={{ minWidth: `${12 + items.length * 13}rem` }}>
                <thead>
                  <tr>
                    <th style={{ width: "12rem" }}><span className="sr-only">Measure</span></th>
                    {items.map((i) => (
                      <th key={i.row.id} style={{ color: "var(--ink)", fontSize: "1.05rem" }}>
                        <Link href={`/${i.row.id}`}>{i.row.name}</Link>
                        <br />
                        <Link href={link(ids.filter((x) => x !== i.row.id))} className="small" style={{ fontWeight: 400 }}>Remove</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsDef.map((r) => (
                    <tr key={r.label}>
                      <th scope="row" className="small">{r.label}</th>
                      {items.map((i) => <td key={i.row.id}>{r.cell(i)}</td>)}
                    </tr>
                  ))}
                  {items.some((i) => i.money.length > 1) ? (
                    <tr>
                      <th scope="row" className="small">Last 12 months</th>
                      {items.map((i) => (
                        <td key={i.row.id} style={{ minWidth: "12rem" }}>
                          {i.money.length > 1 ? <BarChart data={i.money.slice(-12).map((m) => ({ label: periodLabel(m.period), value: m.value }))} format={naira} label={`Monthly allocation to ${i.row.name}`} height={110} /> : null}
                        </td>
                      ))}
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
