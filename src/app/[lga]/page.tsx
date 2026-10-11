import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { AskBox } from "@/components/AskBox";
import { StatusMark } from "@/components/StatusMark";
import { StateMap, NationalLocator } from "@/components/StateMap";
import { BarChart } from "@/components/BarChart";
import { formatDate, ordinal, pct } from "@/lib/format";
import { dict, fill, uiLang } from "@/lib/i18n";
import { getLga, listProjects, listServices } from "@/lib/queries";
import { directory, lgaRecordCount } from "@/lib/national";
import { ledger, monthlySeries, naira, nairaShort, periodLabel, rankFor } from "@/lib/money";
import { lgaFacts } from "@/lib/facts";
import { codeForState } from "@/lib/geo";
import { stateLabel, stateSlug } from "@/lib/ngTiles";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  if (!row) return { title: "LGA" };
  return {
    title: `${row.name} LGA, ${stateLabel(row.state)}`,
    description: `${row.name} Local Government Area, ${stateLabel(row.state)}: ask a question in five languages, see federation allocations, services, projects and public assets, each with its source.`,
  };
}

export default async function LgaHome({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, projects, services, lang, records, money, dir] = await Promise.all([getLga(lga), listProjects(lga), listServices(lga), uiLang(), lgaRecordCount(lga), ledger(lga), directory()]);
  if (!row) notFound();
  const t = dict(lang);
  const active = projects.filter((p) => p.status === "ongoing" || p.status === "stalled").slice(0, 5);
  const joined = records > 0;
  const code = codeForState(row.state);
  const siblings = dir.filter((d) => d.state === row.state);
  const names = Object.fromEntries(siblings.map((d) => [d.id, d.name]));
  const facts = lgaFacts(row);
  const latest = money.at(-1) ?? null;
  const rank = latest ? await rankFor(lga, row.state, latest.period) : null;
  const last24 = money.slice(-24);
  const total12 = money.slice(-12).reduce((n, r) => n + (r.value ?? 0), 0);
  // Example questions built from this council's own records, so each one has an answer.
  const watched = projects.find((p) => p.status === "stalled") ?? projects.find((p) => p.status === "ongoing");
  const suggestions = joined
    ? [
        watched ? `What is happening with the ${watched.name}?` : null,
        services[0] ? `${services[0].name}: how does it work?` : null,
        projects.some((p) => p.status === "stalled") ? "Which projects are stalled?" : null,
      ].filter((s): s is string => Boolean(s))
    : [];
  const about = (
    <>
      <p className="lede measure" lang="en">
        {row.intro ?? `${row.name} is one of ${siblings.length} local government areas in ${stateLabel(row.state)}${row.zone ? `, in the ${row.zone} zone` : ""}.`}
      </p>
      {facts.length ? (
        <dl className="fact-strip mt-2" lang="en">
          {facts.map((f) => (
            <div key={f.key}>
              <dt>{f.label}{f.note ? <span className="muted"> · {f.note}</span> : null}</dt>
              <dd>{f.source ? <a href={f.source} rel="noopener" style={{ color: "inherit" }} title="Source">{f.value}</a> : f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );

  const stateMap = code ? (
    <StateMap code={code} names={names} focus={lga} lit={siblings.filter((s) => s.records > 0).map((s) => s.id)} label={`Map of ${stateLabel(row.state)} with ${row.name} highlighted`} labels="focus" />
  ) : null;

  // One grid: on phones the name, then the ask box, then the intro and facts; on desktop the
  // name and facts on the left and the ask box beside them, so asking is the first thing on screen.
  const hero = (
    <section className="lga-hero">
      <div className="wrap lga-top">
        <div className="lt-title grid gap-3 content-start">
          <nav aria-label="Breadcrumb" className="small muted flex flex-wrap gap-1">
            <Link href="/" className="muted">Nigeria</Link><span aria-hidden="true">/</span>
            <Link href={`/state/${stateSlug(row.state)}`} className="muted">{stateLabel(row.state)}</Link>
          </nav>
          <h1>{row.name}</h1>
        </div>
        <div className="lt-ask panel">
          <AskBox lgaId={lga} t={t} lang={lang} suggestions={suggestions} />
        </div>
        <div className="lt-about grid gap-4 content-start">{about}</div>
      </div>
    </section>
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: `${row.name} Local Government Area`,
    alternateName: row.name,
    containedInPlace: { "@type": "AdministrativeArea", name: stateLabel(row.state), containedInPlace: { "@type": "Country", name: "Nigeria" } },
    ...(row.lat != null && row.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: row.lat, longitude: row.lng } } : {}),
    url: `${SITE_URL}/${lga}`,
  };

  return (
    <LgaShell lgaId={lga} hero={<>{hero}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /></>}>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
        <aside className="grid gap-5 content-start" lang="en">
          {!joined ? (
            <div className="grid gap-2">
              <p className="eyebrow">Council records</p>
              <p className="font-bold">{row.name} has not published its records here yet</p>
              <p className="small" style={{ color: "var(--ink-2)" }}>
                Questions are still logged without personal details, so the council can see what residents need. The facts, map and money on this page come from national public sources.
              </p>
              <p className="small"><Link href="/join">If you work for this council, see how to join</Link></p>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="eyebrow">How answers work here</p>
              <p className="small" style={{ color: "var(--ink-2)" }}>
                Answers come only from the {records} records published for {row.name}, each with its source. Each answer lists the records it used. If none cover your question, you will be told, and you can pass it to an officer.
              </p>
              <p className="small"><Link href="/about-answers">How answers are checked</Link></p>
            </div>
          )}
          <div className="grid gap-2" style={{ borderTop: "1px solid var(--rule)", paddingTop: "1.25rem" }}>
            <p className="font-bold">{t.home.investingHere}</p>
            <p className="small" style={{ color: "var(--ink-2)" }}>{t.home.investingBlurb}</p>
            <p className="small"><Link href={`/${lga}/investment`}>{t.home.readProfile}</Link></p>
          </div>
        </aside>
        {stateMap ? (
          <div className="grid gap-2" lang="en">
            <h2 style={{ fontSize: "1.3rem" }}>Where {row.name} is</h2>
            <div className="w-full max-w-md">{stateMap}</div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6" lang="en" aria-labelledby="money-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <p className="eyebrow">Federation Account (FAAC)</p>
            <h2 id="money-h">Money allocated to {row.name}</h2>
          </div>
          <Link href={`/${lga}/money`} className="btn btn-quiet btn-sm">Full ledger</Link>
        </div>
        {latest ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start">
            <dl className="grid gap-5">
              <div className="grid gap-1">
                <dt className="small muted">{periodLabel(latest.period, true)}, {latest.netNgn != null ? "net paid" : "gross"}</dt>
                <dd className="figure-n">{naira(latest.value)}</dd>
                {latest.change != null ? <dd className={`delta ${latest.change >= 0 ? "up" : "down"}`}>{pct(latest.change)} on the month before</dd> : null}
              </div>
              <div className="grid grid-cols-2 gap-4" style={{ borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
                <div><dt className="small muted">Last {Math.min(12, money.length)} months</dt><dd className="font-bold mono">{nairaShort(total12)}</dd></div>
                {rank && rank.stateOf > 1 ? <div><dt className="small muted">In {stateLabel(row.state)}</dt><dd className="font-bold">{ordinal(rank.state)} of {rank.stateOf}</dd></div> : null}
                {rank && rank.nationalOf > 1 ? <div><dt className="small muted">Nationally</dt><dd className="font-bold">{ordinal(rank.national)} of {rank.nationalOf}</dd></div> : null}
                {row.population && latest.value ? <div><dt className="small muted">Per resident, this month</dt><dd className="font-bold mono">{naira(latest.value / row.population)}</dd></div> : null}
              </div>
            </dl>
            <figure className="grid gap-2">
              <BarChart data={monthlySeries(last24, (r) => r.value)} format={naira} label={`Monthly allocation to ${row.name}, last ${last24.length} months`} />
              <figcaption className="small muted">
                As published by {latest.sourceUrl ? <a href={latest.sourceUrl} rel="noopener">{latest.source}</a> : latest.source}. Month-on-month change and ranks are calculated from the published figures.
              </figcaption>
            </figure>
          </div>
        ) : (
          <div className="empty">
            <p className="font-bold">No allocation months loaded yet</p>
            <p className="small" style={{ color: "var(--ink-2)" }}>Figures are imported from the published monthly FAAC tables, each with its source. They will appear here as a monthly chart and ledger.</p>
          </div>
        )}
      </section>

      {joined ? (
        <section className="grid gap-10 md:grid-cols-2">
          <div className="grid gap-2 content-start">
            <h2>{t.home.projectsOnGround}</h2>
            {active.length === 0 ? <p className="small muted">{t.home.noActiveProjects}</p> : null}
            <ul className="register">
              {active.map((p) => (
                <li key={p.id} className="register-row">
                  <Link href={`/${lga}/projects/${p.id}`} lang="en" className="record-title">{p.name}</Link>
                  <span className="small">
                    <StatusMark status={p.status} /> <span className="muted">{p.ward ?? ""}{p.lastVerified ? `, ${t.home.verified} ${formatDate(p.lastVerified)}` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="small"><Link href={`/${lga}/projects`}>{fill(t.home.allProjects, projects.length)}</Link></p>
          </div>
          <div className="grid gap-2 content-start">
            <h2>{t.home.services}</h2>
            {services.length === 0 ? <p className="small muted">{t.home.noServices}</p> : null}
            <ul className="register">
              {services.slice(0, 6).map((sv) => (
                <li key={sv.id} className="register-row">
                  <Link href={`/${lga}/services/${sv.id}`} lang="en" className="record-title">{sv.name}</Link>
                  <span className="small muted" lang="en">{sv.office ?? ""}</span>
                </li>
              ))}
            </ul>
            <p className="small"><Link href={`/${lga}/services`}>{fill(t.home.allServices, services.length)}</Link></p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4" lang="en" style={{ borderTop: "1px solid var(--rule)", paddingTop: "2rem" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 style={{ fontSize: "1.3rem" }}>Other local governments in {stateLabel(row.state)}</h2>
          <Link href={`/state/${stateSlug(row.state)}`} className="small">Compare all {siblings.length}</Link>
        </div>
        <ul className="chips">
          {siblings.filter((s) => s.id !== lga).map((s) => (
            <li key={s.id}><Link href={`/${s.id}`} className="chip">{s.name}{s.records > 0 ? <span className="legend-dot" style={{ background: "var(--lit)", margin: 0 }} title="Publishing records" /> : null}</Link></li>
          ))}
        </ul>
        {code ? (
          <div className="flex items-center gap-3 small muted">
            <NationalLocator code={code} label={`${stateLabel(row.state)} on the map of Nigeria`} size={72} />
            <span>{stateLabel(row.state)}, {row.zone ?? "Nigeria"}</span>
          </div>
        ) : null}
      </section>
    </LgaShell>
  );
}
