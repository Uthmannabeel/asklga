import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { AskBox } from "@/components/AskBox";
import { StatusMark } from "@/components/StatusMark";
import { formatDate } from "@/lib/format";
import { dict, fill, uiLang } from "@/lib/i18n";
import { getLga, listProjects, listServices } from "@/lib/queries";
import { formatNaira } from "@/lib/register";
import { latestAllocation, lgaRecordCount } from "@/lib/national";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  return { title: row ? `${row.name} LGA, ${row.state}` : "LGA" };
}

export default async function LgaHome({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, projects, services, lang, records, allocation] = await Promise.all([getLga(lga), listProjects(lga), listServices(lga), uiLang(), lgaRecordCount(lga), latestAllocation(lga)]);
  if (!row) notFound();
  const t = dict(lang);
  const active = projects.filter((p) => p.status === "ongoing" || p.status === "stalled").slice(0, 5);
  const joined = records > 0;

  const hero = (
    <section className="lga-hero">
      <div className="wrap pt-10 pb-2 grid gap-4">
        <p className="eyebrow">{row.state === "Federal Capital Territory" ? row.state : `${row.state} ${t.home.state}`}{row.zone ? ` · ${row.zone}` : ""}</p>
        <h1>{row.name}</h1>
        {row.intro ? <p className="lede measure" lang="en">{row.intro}</p> : null}
        <dl className="fact-strip mt-4" lang="en">
          <div><dt>Population</dt><dd>{row.population ? <>{row.population.toLocaleString("en-NG")}{row.populationYear ? <span className="muted" style={{ fontWeight: 400 }}> ({row.populationYear})</span> : null}</> : <span className="muted" style={{ fontWeight: 400 }}>Not published</span>}</dd></div>
          <div><dt>Headquarters</dt><dd>{row.headquarters ?? <span className="muted" style={{ fontWeight: 400 }}>Not published</span>}</dd></div>
          <div><dt>Federation allocation</dt><dd>{allocation ? <Link href={`/${lga}/money`}>{formatNaira(allocation.netNgn ?? allocation.grossNgn)}, {allocation.period}</Link> : <Link href={`/${lga}/money`} style={{ fontWeight: 400 }}>Not loaded yet</Link>}</dd></div>
          <div><dt>Approved records</dt><dd>{records}</dd></div>
        </dl>
      </div>
    </section>
  );

  return (
    <LgaShell lgaId={lga} hero={hero}>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        <div className="panel">
          <AskBox lgaId={lga} t={t} lang={lang} />
        </div>
        <aside className="grid gap-4 content-start" lang="en">
          {!joined ? (
            <div className="stamp stamp-caution">
              <div><strong>No approved records yet</strong></div>
              <div>
                {row.name} has not yet published its services, projects and assets here. Questions you ask are still logged, so the council can see what people need.{" "}
                <Link href="/join">LGA officials can join here.</Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="eyebrow">How answers work here</p>
              <p className="small" style={{ color: "var(--ink-2)" }}>
                Answers come only from the {records} records {row.name} has approved. Each answer lists the records it used. If none cover your question, you will be told, and you can pass it to an officer.
              </p>
              <p className="small"><Link href="/about-answers">How answers are checked</Link></p>
            </div>
          )}
          <div className="grid gap-2" style={{ borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
            <p className="font-bold">{t.home.investingHere}</p>
            <p className="small" style={{ color: "var(--ink-2)" }}>{t.home.investingBlurb}</p>
            <p className="small"><Link href={`/${lga}/investment`}>{t.home.readProfile}</Link></p>
          </div>
        </aside>
      </section>

      {joined ? (
        <section className="grid gap-10 md:grid-cols-2">
          <div className="grid gap-2 content-start">
            <h2>{t.home.projectsOnGround}</h2>
            {active.length === 0 ? <p className="small muted">{t.home.noActiveProjects}</p> : null}
            <ul className="register">
              {active.map((p) => (
                <li key={p.id} className="register-row">
                  <Link href={`/${lga}/projects/${p.id}`} lang="en" className="font-bold">{p.name}</Link>
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
                  <Link href={`/${lga}/services/${sv.id}`} lang="en" className="font-bold">{sv.name}</Link>
                  <span className="small muted" lang="en">{sv.office ?? ""}</span>
                </li>
              ))}
            </ul>
            <p className="small"><Link href={`/${lga}/services`}>{fill(t.home.allServices, services.length)}</Link></p>
          </div>
        </section>
      ) : null}
    </LgaShell>
  );
}
