import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { StateMap, NationalLocator } from "@/components/StateMap";
import { BarChart } from "@/components/BarChart";
import { stateLabel, stateSlug, tileBySlug, TILES } from "@/lib/ngTiles";
import { stateLgas, stateSeries, type StateLgaRow } from "@/lib/states";
import { naira, nairaShort, periodLabel } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = tileBySlug(slug);
  if (!t) return { title: "State" };
  return {
    title: `${stateLabel(t.state)}: local government areas`,
    description: `Every local government area in ${stateLabel(t.state)} on one map, with population, land area, federation allocations and which councils publish their records.`,
  };
}

const SORTS = {
  name: { label: "Local government", get: (r: StateLgaRow) => r.name, num: false },
  population: { label: "Population", get: (r: StateLgaRow) => r.population, num: true },
  area: { label: "Area km²", get: (r: StateLgaRow) => r.areaKm2, num: true },
  latest: { label: "Latest allocation", get: (r: StateLgaRow) => r.latest, num: true },
  perHead: { label: "Per resident", get: (r: StateLgaRow) => r.perHead, num: true },
} as const;
type SortKey = keyof typeof SORTS;

export default async function StatePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; dir?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const tile = tileBySlug(slug);
  if (!tile) notFound();
  const [{ rows, period }, series] = await Promise.all([stateLgas(tile.state), stateSeries(tile.state)]);
  const sort: SortKey = sp.sort && sp.sort in SORTS ? (sp.sort as SortKey) : "name";
  const dir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : SORTS[sort].num ? "desc" : "asc";
  const get = SORTS[sort].get;
  const sorted = [...rows].sort((a, b) => {
    const va = get(a), vb = get(b);
    if (va == null && vb == null) return a.name.localeCompare(b.name);
    if (va == null) return 1;
    if (vb == null) return -1;
    const c = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return dir === "asc" ? c : -c;
  });
  const names = Object.fromEntries(rows.map((r) => [r.id, r.name]));
  const lit = rows.filter((r) => r.records > 0);
  const pop = rows.reduce((n, r) => n + (r.population ?? 0), 0);
  const popCount = rows.filter((r) => r.population).length;
  const area = rows.reduce((n, r) => n + (r.areaKm2 ?? 0), 0);
  const monthTotal = rows.reduce((n, r) => n + (r.latest ?? 0), 0);
  const hasPop = popCount > 0, hasArea = rows.some((r) => r.areaKm2), hasMoney = period != null;
  const label = stateLabel(tile.state);

  const th = (key: SortKey) => {
    const active = sort === key;
    const next = active ? (dir === "asc" ? "desc" : "asc") : SORTS[key].num ? "desc" : "asc";
    return (
      <th className={SORTS[key].num ? "num" : ""} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link href={`/state/${slug}?sort=${key}&dir=${next}#lgas`} scroll={false} style={{ color: "inherit", textDecoration: active ? "underline" : "none" }}>
          {SORTS[key].label}{active ? (dir === "asc" ? " ↑" : " ↓") : ""}
        </Link>
      </th>
    );
  };

  return (
    <>
      <SiteHeader back={`/state/${slug}`} />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow={tile.state === "Federal Capital Territory" ? "Federal Capital Territory" : "State"}
          title={label}
          lede={`${rows.length} local government areas. Select one on the map or in the table to see its facts, money and records.`}
          aside={<NationalLocator code={tile.code} label={`${label} on the map of Nigeria`} size={150} />}
        >
          <dl className="fact-strip">
            <div><dt>Local government areas</dt><dd>{rows.length}</dd></div>
            <div><dt>Publishing records</dt><dd>{lit.length}</dd></div>
            {hasPop ? <div><dt>Population, {popCount === rows.length ? "2006 census" : `${popCount} LGAs on file`}</dt><dd className="mono">{pop.toLocaleString("en-NG")}</dd></div> : null}
            {hasArea ? <div><dt>Land area</dt><dd className="mono">{Math.round(area).toLocaleString("en-NG")} km²</dd></div> : null}
            {hasMoney ? <div><dt>FAAC to its LGAs, {periodLabel(period!, true)}</dt><dd className="mono">{nairaShort(monthTotal)}</dd></div> : null}
          </dl>
        </PageHead>

        <div className="wrap py-10 grid gap-12">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
            <StateMap code={tile.code} names={names} lit={lit.map((r) => r.id)} label={`Map of ${label} showing its ${rows.length} local government areas`} />
            <div className="grid gap-6 content-start">
              <div className="grid gap-2">
                <h2 style={{ fontSize: "1.3rem" }}>Councils publishing records</h2>
                {lit.length ? (
                  <ul className="grid gap-1">{lit.map((r) => <li key={r.id}><Link href={`/${r.id}`}>{r.name}</Link> <span className="small muted">{r.records} approved records</span></li>)}</ul>
                ) : (
                  <p className="small" style={{ color: "var(--ink-2)" }}>None yet. Every council here still has a page with national public data, and residents&apos; questions are logged for the council to see. <Link href="/join">How a council joins</Link></p>
                )}
              </div>
              {series.length > 1 ? (
                <figure className="grid gap-2">
                  <figcaption className="font-bold">Monthly FAAC to all {label} LGAs</figcaption>
                  <BarChart data={series.map((r) => ({ label: periodLabel(r.period), value: r.total }))} format={naira} label={`Monthly allocation to all LGAs in ${label}`} height={160} />
                </figure>
              ) : null}
            </div>
          </section>

          <section id="lgas" className="grid gap-3" style={{ scrollMarginTop: "1rem" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2>All {rows.length} local government areas</h2>
              {hasMoney ? <span className="small muted">Allocation: {periodLabel(period!, true)}, net where published</span> : null}
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {th("name")}
                    <th>Headquarters</th>
                    {hasPop ? th("population") : null}
                    {hasArea ? th("area") : null}
                    {hasMoney ? th("latest") : null}
                    {hasMoney && hasPop ? th("perHead") : null}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/${r.id}`}>{r.name}</Link>
                        {r.records > 0 ? <span className="legend-dot" style={{ background: "var(--lit)", marginLeft: "0.5rem" }} title="Publishing records" /> : null}
                      </td>
                      <td>{r.headquarters ?? <span className="muted">Not on file</span>}</td>
                      {hasPop ? <td className="num">{r.population ? r.population.toLocaleString("en-NG") : ""}</td> : null}
                      {hasArea ? <td className="num">{r.areaKm2 ? Math.round(r.areaKm2).toLocaleString("en-NG") : ""}</td> : null}
                      {hasMoney ? <td className="num">{r.latest != null ? naira(r.latest) : ""}</td> : null}
                      {hasMoney && hasPop ? <td className="num">{r.perHead != null ? naira(r.perHead) : ""}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">Select a column heading to sort. Per resident divides the month&apos;s allocation by the census population, so it shows relative weight, not spending.</p>
          </section>

          <section className="grid gap-3" style={{ borderTop: "1px solid var(--rule)", paddingTop: "2rem" }}>
            <h2 style={{ fontSize: "1.3rem" }}>Other states</h2>
            <ul className="chips">
              {TILES.filter((t) => t.code !== tile.code).sort((a, b) => a.state.localeCompare(b.state)).map((t) => (
                <li key={t.code}><Link href={`/state/${stateSlug(t.state)}`} className="chip">{t.state === "Federal Capital Territory" ? "FCT" : t.state}</Link></li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
