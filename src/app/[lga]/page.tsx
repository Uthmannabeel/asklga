import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { AskBox } from "@/components/AskBox";
import { StatusMark } from "@/components/StatusMark";
import { formatDate } from "@/lib/format";
import { dict, fill, uiLang } from "@/lib/i18n";
import { getLga, listProjects, listServices } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  return { title: row ? `${row.name} LGA` : "LGA" };
}

export default async function LgaHome({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, projects, services, lang] = await Promise.all([getLga(lga), listProjects(lga), listServices(lga), uiLang()]);
  if (!row) notFound();
  const t = dict(lang);
  const active = projects.filter((p) => p.status === "ongoing" || p.status === "stalled").slice(0, 5);

  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-3">
        <p className="small muted">{row.state} {t.home.state}</p>
        <h1>{row.name}</h1>
        {row.intro ? <p className="measure text-lg" lang="en">{row.intro}</p> : null}
      </section>

      <section>
        <AskBox lgaId={lga} t={t} lang={lang} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <h2>{t.home.projectsOnGround}</h2>
          {active.length === 0 ? <p className="small muted">{t.home.noActiveProjects}</p> : null}
          <ul className="register">
            {active.map((p) => (
              <li key={p.id} className="register-row">
                <Link href={`/${lga}/projects/${p.id}`} lang="en">{p.name}</Link>
                <span className="small">
                  <StatusMark status={p.status} /> <span className="muted">{p.ward ?? ""}{p.lastVerified ? `, ${t.home.verified} ${formatDate(p.lastVerified)}` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="small"><Link href={`/${lga}/projects`}>{fill(t.home.allProjects, projects.length)}</Link></p>
        </div>
        <div className="grid gap-2">
          <h2>{t.home.services}</h2>
          {services.length === 0 ? <p className="small muted">{t.home.noServices}</p> : null}
          <ul className="register">
            {services.slice(0, 6).map((sv) => (
              <li key={sv.id} className="register-row">
                <Link href={`/${lga}/services/${sv.id}`} lang="en">{sv.name}</Link>
                <span className="small muted" lang="en">{sv.office ?? ""}</span>
              </li>
            ))}
          </ul>
          <p className="small"><Link href={`/${lga}/services`}>{fill(t.home.allServices, services.length)}</Link></p>
        </div>
      </section>

      <section className="measure grid gap-2">
        <h2>{t.home.investingHere}</h2>
        <p>{t.home.investingBlurb}</p>
        <p className="small"><Link href={`/${lga}/investment`}>{t.home.readProfile}</Link></p>
      </section>
    </LgaShell>
  );
}
