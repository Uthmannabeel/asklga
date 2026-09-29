import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead, NotPublished } from "@/components/LgaPageHead";
import { ProjectMap } from "@/components/ProjectMap";
import { SourceStamp } from "@/components/SourceStamp";
import { StatusMark, statusLabel } from "@/components/StatusMark";
import { getLga, listProjects } from "@/lib/queries";
import { naira, nairaShort } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

const ORDER = ["ongoing", "stalled", "abandoned", "unknown", "planned", "completed"];

export default async function ProjectsPage({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ status?: string | string[] }> }) {
  const { lga } = await params;
  const sp = await searchParams;
  const requested = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = requested && ORDER.includes(requested) ? requested : undefined;
  const [row, all] = await Promise.all([getLga(lga), listProjects(lga)]);
  if (!row) notFound();
  const projects = status ? all.filter((p) => p.status === status) : all;
  const counts = ORDER.map((st) => [st, all.filter((p) => p.status === st).length] as const).filter(([, n]) => n > 0);
  const points = projects.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, name: p.name, lat: p.lat!, lng: p.lng!, status: p.status, href: `/${lga}/projects/${p.id}` }));
  const total = all.reduce((sum, p) => sum + (p.amountNgn ?? 0), 0);
  const withEvidence = all.filter((p) => p.evidence.length > 0).length;
  const troubled = all.filter((p) => p.status === "stalled" || p.status === "abandoned").length;

  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/projects`}
      hero={
        <LgaPageHead lgaId={lga} title="Projects" lede="Every capital project the council has published: who is paying, what was budgeted, what stands on the ground, and when someone last checked.">
          {all.length ? (
            <dl className="fact-strip">
              <div><dt>Projects</dt><dd>{all.length}</dd></div>
              <div><dt>Budgeted, where published</dt><dd className="mono">{nairaShort(total)}</dd></div>
              <div><dt>With site evidence</dt><dd>{withEvidence}</dd></div>
              <div><dt>Stalled or abandoned</dt><dd style={{ color: troubled ? "var(--caution)" : undefined }}>{troubled}</dd></div>
            </dl>
          ) : null}
        </LgaPageHead>
      }
    >
      {all.length === 0 ? (
        <NotPublished what="projects register" name={row.name} />
      ) : (
        <>
          <section className="grid gap-4">
            <nav aria-label="Filter by status" className="chips">
              <Link href={`/${lga}/projects`} scroll={false} className="chip" aria-current={!status ? "page" : undefined}>All <span className="n">{all.length}</span></Link>
              {counts.map(([st, n]) => (
                <Link key={st} href={`/${lga}/projects?status=${st}`} scroll={false} className="chip" aria-current={status === st ? "page" : undefined}>
                  {statusLabel(st)} <span className="n">{n}</span>
                </Link>
              ))}
            </nav>
            {points.length ? <ProjectMap points={points} center={[row.lat ?? 4.85, row.lng ?? 6.99]} /> : null}
          </section>

          <section>
            <ol className="register">
              {projects.map((p) => (
                <li key={p.id} className="register-row md:grid-cols-[minmax(0,1fr)_12rem] md:gap-x-8" style={{ padding: "1.15rem 0" }}>
                  <div className="grid gap-1.5">
                    <Link href={`/${lga}/projects/${p.id}`} className="record-title">{p.name}</Link>
                    <span className="small" style={{ color: "var(--ink-2)" }}>
                      <StatusMark status={p.status} />{" "}
                      {[p.type, p.ward ? `${p.ward} ward` : null, `${p.sponsor} sponsored`, p.budgetYear ? `${p.budgetYear} budget` : null].filter(Boolean).join(" · ")}
                    </span>
                    {p.statusNote ? <span className="small">{p.statusNote}</span> : null}
                    <SourceStamp compact id={p.id} source={p.source} sourceUrl={p.sourceUrl} lastVerified={p.lastVerified} />
                  </div>
                  <div className="md:text-right grid content-start gap-1">
                    <span className="mono font-bold">{p.amountNgn != null ? naira(p.amountNgn) : <span className="muted" style={{ fontWeight: 400 }}>Amount not published</span>}</span>
                    {p.evidence.length ? <span className="small muted">{p.evidence.length} evidence item{p.evidence.length > 1 ? "s" : ""}</span> : null}
                  </div>
                </li>
              ))}
            </ol>
            {projects.length === 0 ? <p className="muted">No projects with that status.</p> : null}
          </section>
        </>
      )}
    </LgaShell>
  );
}
