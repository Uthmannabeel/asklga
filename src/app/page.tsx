import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LgaFinder, type FinderRow } from "@/components/LgaFinder";
import { NationalMap, type NationalRow } from "@/components/NationalMap";
import { AnswerSpecimen } from "@/components/AnswerSpecimen";
import { directory, nationalSummary } from "@/lib/national";
import { TILES, stateLabel, stateSlug } from "@/lib/ngTiles";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { month, nairaShort, periodLabel, periods } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = {
  title: { absolute: "AskLGA: ask your local government, get the official answer" },
  description: "Every one of Nigeria's 774 local government areas has a page. Ask about services, projects, public assets and money in English, Pidgin, Hausa, Yoruba or Igbo, and see the published record behind every answer.",
};

const Arrow = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="task-arrow"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default async function Home() {
  const rows = await directory();
  const sum = await nationalSummary(rows);
  const demo = rows.find((r) => r.demo) ?? rows.find((r) => r.id === "obio-akpor");
  const demoId = demo?.id ?? "obio-akpor";
  const finderRows: FinderRow[] = rows.map((r) => [r.id, r.name, r.state, r.records > 0 ? 1 : 0]);
  const allPeriods = await periods();
  const latestPeriod = allPeriods[0];
  const monthRows = latestPeriod ? await month(latestPeriod) : [];
  const perHead = new Map(monthRows.map((r) => [r.id, r.perHead]));
  const mapRows: NationalRow[] = rows.map((r) => [r.id, r.name, r.state, r.records > 0 ? 1 : 0, perHead.get(r.id) ?? null]);
  const money = latestPeriod && monthRows.length
    ? { period: latestPeriod, total: monthRows.reduce((n, r) => n + r.value, 0), count: monthRows.length }
    : null;
  // Proof figures, each read from the database and linked to where it can be checked.
  const db = await getDb();
  const [evalRun] = await db.select().from(s.evalRuns).where(eq(s.evalRuns.verified, true)).orderBy(desc(s.evalRuns.ranAt)).limit(1);
  const [allocCount] = await db.select({ n: sql<number>`count(*)` }).from(s.allocations);
  const firstPeriod = allPeriods.at(-1);

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
                Not sure? <Link href="/compare">Browse by state</Link>. Or try the pilot council, <Link href={`/${demoId}`}>{demo?.name ?? "Obio/Akpor"}</Link>.
              </p>
              <div className="hero-voice">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                <div className="grid gap-3 justify-items-start">
                  <p>
                    <strong>Or just talk.</strong> Press once, ask in Hausa, Yoruba, Igbo, Pidgin or English, and hear the answer read back from the council&apos;s records. Cut in whenever you like.
                  </p>
                  <Link href={`/${demoId}/talk`} className="btn btn-on-band">Talk to {demo?.name ?? "Obio/Akpor"}</Link>
                </div>
              </div>
            </div>
            <AnswerSpecimen />
          </div>
        </section>

        {/* 1b. Proof: figures a judge or a journalist can check, each linked to its evidence. */}
        <section className="proof-strip" aria-label="AskLGA in figures">
          <dl className="wrap">
            {evalRun ? (
              <div>
                <dt className="sr-only">Answer accuracy</dt>
                <dd className="proof-n">{evalRun.pass}/{evalRun.cases}</dd>
                <dd className="proof-l">test questions answered correctly, scored by the server. <Link href="/scoreboard">Scoreboard</Link></dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Local government pages</dt>
              <dd className="proof-n">{sum.lgas}</dd>
              <dd className="proof-l">local government pages, each with its official GRID3 boundary</dd>
            </div>
            {Number(allocCount?.n) ? (
              <div>
                <dt className="sr-only">Allocation records</dt>
                <dd className="proof-n">{Number(allocCount.n).toLocaleString("en-NG")}</dd>
                <dd className="proof-l">monthly FAAC allocations{firstPeriod && latestPeriod ? `, ${periodLabel(firstPeriod, true)} to ${periodLabel(latestPeriod, true)}` : ""}. <Link href="/money">Money</Link></dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Languages</dt>
              <dd className="proof-n">5</dd>
              <dd className="proof-l">languages, typed or spoken: English, Pidgin, Hausa, Yoruba, Igbo</dd>
            </div>
          </dl>
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

        {/* 3. The signature: every LGA on one map, shaded by money per resident. */}
        {money ? (
          <section id="map" className="bg-canvas" style={{ borderBlock: "1px solid var(--rule)", scrollMarginTop: "1rem" }}>
            <div className="wrap py-16 md:py-20 grid gap-8">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="grid gap-3 measure">
                  <p className="eyebrow">Federation Account (FAAC), {periodLabel(money.period, true)}</p>
                  <h2>Follow the money to all {sum.lgas} councils</h2>
                  <p className="lede">{nairaShort(money.total)} went to {money.count} local governments this month. Darker areas got more per resident.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/money" className="btn">All allocations</Link>
                  <Link href="/compare" className="btn btn-quiet">Compare councils</Link>
                </div>
              </div>
              <NationalMap rows={mapRows} period={periodLabel(money.period, true)} />
              <p className="small muted">
                Allocations as published by the Office of the Accountant-General, via the National Bureau of Statistics. Per resident uses the 2006 census, so it shows relative weight, not spending per person. Boundaries: GRID3 Nigeria via geoBoundaries, CC BY 4.0. <Link href="/about#sources">Sources</Link>
              </p>
            </div>
          </section>
        ) : null}

        {/* 4. What a page gives you. */}
        <section className="wrap py-16 md:py-20 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="grid gap-3 content-start">
            <h2>On every LGA page</h2>
            <p className="muted">The links below open the pilot council, {demo?.name ?? "Obio/Akpor"}, whose records are compiled from its own website and dated reports.</p>
          </div>
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
            <div className="grid gap-3 content-start">
              <h2>Built so you can check every answer</h2>
              <p className="muted">A wrong answer from government is worse than none. These are the rules every answer follows.</p>
            </div>
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

        {/* 5b. What it is built on. Names, not logos: these are sources and tools, not endorsements. */}
        <section className="wrap py-12 grid gap-5" aria-labelledby="built-on">
          <h2 id="built-on" className="eyebrow" style={{ fontSize: "0.8rem", letterSpacing: "0.02em" }}>Built on open public data and open models</h2>
          <ul className="credits">
            <li><strong>N-ATLAS</strong><span>Speech recognition, NCAIR</span></li>
            <li><strong>GRID3 Nigeria</strong><span>LGA boundaries</span></li>
            <li><strong>OAGF and NBS</strong><span>FAAC allocations</span></li>
            <li><strong>NBS</strong><span>2006 census population</span></li>
            <li><strong>Council records</strong><span>Services, projects, notices</span></li>
          </ul>
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
