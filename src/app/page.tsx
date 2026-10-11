import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LgaFinder, type FinderRow } from "@/components/LgaFinder";
import { NigeriaMap } from "@/components/NigeriaMap";
import { AnswerSpecimen } from "@/components/AnswerSpecimen";
import { directory, nationalSummary } from "@/lib/national";
import { TILES, stateLabel, stateSlug, tileByCode } from "@/lib/ngTiles";
import { month, naira, nairaShort, periodLabel, periods } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = {
  title: { absolute: "AskLGA: ask your local government, get the official answer" },
  description: "Every one of Nigeria's 774 local government areas has a page. Ask about services, projects, public assets and money in English, Pidgin, Hausa, Yoruba or Igbo, and see the published record behind every answer.",
};

const Arrow = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="task-arrow"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default async function Home({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const rows = await directory();
  const sum = await nationalSummary(rows);
  const tile = tileByCode(state);
  const demo = rows.find((r) => r.demo) ?? rows.find((r) => r.id === "obio-akpor");
  const demoId = demo?.id ?? "obio-akpor";
  const finderRows: FinderRow[] = rows.map((r) => [r.id, r.name, r.state, r.records > 0 ? 1 : 0]);
  const stateRows = tile ? rows.filter((r) => r.state === tile.state) : [];
  const publishing = rows.filter((r) => r.records > 0);
  const latestPeriod = (await periods())[0];
  const monthRows = latestPeriod ? await month(latestPeriod) : [];
  const money = latestPeriod && monthRows.length
    ? {
        period: latestPeriod,
        total: monthRows.reduce((n, r) => n + r.value, 0),
        count: monthRows.length,
        top: monthRows.slice(0, 5),
        perHead: monthRows.filter((r) => r.perHead != null).sort((a, b) => b.perHead! - a.perHead!).slice(0, 5),
      }
    : null;

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* 1. Ask: the one task most visitors came for, and what the answer looks like. */}
        <section className="band">
          <div className="wrap py-12 md:py-20 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 items-center">
            <div className="grid gap-7">
              <p className="eyebrow">For all 774 local government areas in Nigeria</p>
              <h1>Ask your local government. Get the official answer.</h1>
              <p className="lede measure">
                Ask about services, projects or council money in English, Pidgin, Hausa, Yoruba or Igbo. Every answer shows its source.
              </p>
              <div className="max-w-xl">
                <LgaFinder rows={finderRows} states={TILES.map((t) => ({ slug: stateSlug(t.state), label: stateLabel(t.state) }))} label="Which local government area do you live in?" />
              </div>
              <p className="small muted">
                Not sure? <Link href="#map">Pick your state on the map</Link>. Or try the pilot council, <Link href={`/${demoId}`}>{demo?.name ?? "Obio/Akpor"}</Link>.
              </p>
            </div>
            <AnswerSpecimen />
          </div>
        </section>

        {/* 2. How it works, in three plain steps. */}
        <section className="wrap py-16 md:py-20 grid gap-10">
          <h2>How it works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            <li className="step">
              <span className="step-num">01</span>
              <h3>Find your area</h3>
              <p className="muted">All {sum.lgas} local government areas have a page.</p>
            </li>
            <li className="step">
              <span className="step-num">02</span>
              <h3>Ask the way you talk</h3>
              <p className="muted">Type or speak, in five languages. No name or phone number needed.</p>
            </li>
            <li className="step">
              <span className="step-num">03</span>
              <h3>Check the source</h3>
              <p className="muted">Each answer cites its records. If none covers your question, it says so.</p>
            </li>
          </ol>
        </section>

        {/* 3. The national map: the signature. */}
        <section id="map" className="bg-canvas" style={{ borderBlock: "1px solid var(--rule)", scrollMarginTop: "1rem" }}>
          <div className="wrap py-16 md:py-20 grid gap-10">
            <div className="grid gap-3 measure">
              <p className="eyebrow">The national layer</p>
              <h2>{sum.lgas} local governments. One map.</h2>
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
                      <Link href="/#map" scroll={false} className="small">Clear</Link>
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

        {/* 3b. Money: only once published FAAC months are loaded. */}
        {money ? (
          <section className="wrap py-16 md:py-20 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div className="grid gap-3 content-start">
              <p className="eyebrow">Federation Account (FAAC), {periodLabel(money.period, true)}</p>
              <h2>Follow the money to every council</h2>
              <p className="lede">{nairaShort(money.total)} went to {money.count} local governments this month.</p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Link href="/money" className="btn">Allocations across Nigeria</Link>
                <Link href="/compare" className="btn btn-quiet">Compare councils</Link>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {([["Highest this month", money.top], ...(money.perHead.length ? [["Most per resident (2006 census)", money.perHead]] : [])] as [string, typeof money.top][]).map(([h, list]) => (
                <div key={h as string} className="grid gap-2 content-start">
                  <p className="font-bold">{h as string}</p>
                  <ol className="register">
                    {(list as typeof money.top).map((r, i) => (
                      <li key={r.id} className="flex items-baseline justify-between gap-3" style={{ padding: "0.6rem 0" }}>
                        <span><span className="mono muted small">{i + 1}</span> <Link href={`/${r.id}/money`}>{r.name}</Link> <span className="small muted">{r.state}</span></span>
                        <span className="mono small">{h === "Most per resident (2006 census)" ? naira(r.perHead) : nairaShort(r.value)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* 4. What a page gives you. */}
        <section className="wrap py-16 md:py-20 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2>On every LGA page</h2>
          <ul className="task-list">
            {[
              ["services", "Services and how to get them", "Who can apply, what to bring, where to go."],
              ["projects", "Projects on the ground", "Status, ward and when it was last checked."],
              ["assets", "Public assets on a map", "Clinics, schools, markets and boreholes, mapped."],
              ["money", "Money from the federation", "Monthly FAAC allocations."],
              ["investment", "Investing in the area", "Land, approvals and contacts."],
              ["open-data", "Open data", "Every register as JSON and CSV."],
            ].map(([slug, title, desc]) => (
              <li key={slug}>
                <Link href={`/${demoId}/${slug}`}>
                  <span className="task-title">{title}</span>
                  <Arrow />
                  <span className="task-desc">{desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Why an answer can be trusted. */}
        <section className="bg-canvas" style={{ borderTop: "1px solid var(--rule)" }}>
          <div className="wrap py-16 md:py-20 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <h2>Built so you can check every answer</h2>
            <div>
              {[
                ["Published records only", <>Never the open web. <Link href="/about-answers">How answers are checked</Link></>],
                ["Source on every answer", <>Each answer lists the record IDs it used.</>],
                ["Accuracy in public", <>Scores on a fixed test set are public. <Link href="/scoreboard">Scoreboard</Link></>],
                ["Personal details removed", <>Names and phone numbers are stripped. <Link href="/privacy">Privacy</Link></>],
                ["Open standard", <>One schema any council can adopt. <Link href="/standard">The standard</Link></>],
              ].map(([k, v]) => (
                <div key={k as string} className="proof">
                  <p className="font-bold">{k}</p>
                  <p className="text-ink-2" style={{ color: "var(--ink-2)" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. For councils. */}
        <section className="band">
          <div className="wrap py-14 md:py-16 grid gap-6 md:grid-cols-[1.5fr_auto] md:items-end">
            <div className="grid gap-3 measure">
              <h2>Run a local government?</h2>
              <p className="lede">Publish once, answer residents in their language every day. Free and open source.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/join" className="btn btn-on-band">How to join</Link>
              <Link href="/standard" className="btn btn-ghost-band">Read the standard</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
