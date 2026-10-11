import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NigeriaMap } from "@/components/NigeriaMap";
import { directory, nationalSummary } from "@/lib/national";
import { stateLabel, stateSlug, tileByCode } from "@/lib/ngTiles";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Map of Nigeria's 774 local governments",
  description: "Every state as a tile, every local government area as a dot. Lit dots publish records residents can ask about.",
};

export default async function MapPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const rows = await directory();
  const sum = await nationalSummary(rows);
  const tile = tileByCode(state);
  const stateRows = tile ? rows.filter((r) => r.state === tile.state) : [];
  const publishing = rows.filter((r) => r.records > 0);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section>
          <div className="wrap py-16 md:py-20 grid gap-10">
            <div className="grid gap-3 measure">
              <p className="eyebrow">Map</p>
              <h1>{sum.lgas} local governments. One map.</h1>
              <p className="lede">Each square is a state; each dot is one of its areas. Pick a state.</p>
            </div>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start">
              <div className="grid gap-4">
                <NigeriaMap rows={rows} selected={tile?.code} />
                <p className="small muted flex flex-wrap gap-x-5 gap-y-1">
                  <span><span className="legend-dot" style={{ background: "var(--lit)" }} />Publishing records</span>
                  <span><span className="legend-dot" style={{ background: "var(--unlit)" }} />Has a page, not yet joined</span>
                </p>
              </div>
              <div className="panel grid gap-5">
                {tile ? (
                  <>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 style={{ fontSize: "1.5rem" }}>{stateLabel(tile.state)}</h3>
                      <Link href="/map" scroll={false} className="small">Clear</Link>
                    </div>
                    <p className="small muted">{stateRows.length} local government areas, {stateRows.filter((r) => r.records > 0).length} publishing records.</p>
                    <Link href={`/state/${stateSlug(tile.state)}`} className="btn btn-sm justify-self-start">Open the {stateLabel(tile.state)} page</Link>
                    <ul className="grid gap-x-6 sm:grid-cols-2" style={{ columnGap: "1.5rem" }}>
                      {stateRows.map((r) => (
                        <li key={r.id} style={{ borderTop: "1px solid var(--rule)" }}>
                          <Link href={`/${r.id}`} className="flex items-center justify-between gap-2 py-2 no-underline hover:underline" style={{ color: "var(--ink)" }}>
                            <span>{r.name}</span>
                            {r.records > 0 ? <span className="legend-dot" style={{ background: "var(--lit)", marginRight: 0 }} title="Publishing" /> : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-6">
                      <div className="stat"><dt className="stat-l">Local government areas</dt><dd className="stat-n">{sum.lgas}</dd></div>
                      <div className="stat"><dt className="stat-l">States, plus the FCT</dt><dd className="stat-n">{sum.states}</dd></div>
                      <div className="stat"><dt className="stat-l">Languages</dt><dd className="stat-n">5</dd></div>
                      <div className="stat"><dt className="stat-l">Published records</dt><dd className="stat-n">{sum.records}</dd></div>
                    </dl>
                    <div className="grid gap-2" style={{ borderTop: "1px solid var(--rule)", paddingTop: "1.25rem" }}>
                      <p className="font-bold">Publishing now</p>
                      {publishing.length ? (
                        <ul className="grid gap-1">
                          {publishing.map((r) => (
                            <li key={r.id}><Link href={`/${r.id}`}>{r.name}</Link> <span className="muted small">{stateLabel(r.state)}{r.demo ? ", demo records" : ""}</span></li>
                          ))}
                        </ul>
                      ) : <p className="small muted">No council has published yet.</p>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
