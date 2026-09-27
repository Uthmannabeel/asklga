import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { ProjectMap } from "@/components/ProjectMap";
import { SourceStamp } from "@/components/SourceStamp";
import { StatusMark, statusLabel } from "@/components/StatusMark";
import { getLga, listProjects } from "@/lib/queries";
import { formatNaira } from "@/lib/register";

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

  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <h1>Projects register</h1>
        <p className="measure">
          Every capital project the LGA has approved for publication, with who is paying, what was budgeted, what stands on the ground, and when it was last checked.
        </p>
        <table className="max-w-xl">
          <tbody>
            <tr><th>Projects listed</th><td>{all.length}</td></tr>
            <tr><th>With site evidence</th><td>{withEvidence}</td></tr>
            <tr><th>Budgeted total, where published</th><td>{formatNaira(total)} <span className="small muted">(N = naira)</span></td></tr>
          </tbody>
        </table>
      </section>

      <section className="grid gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-x-3 gap-y-1 small">
          <Link href={`/${lga}/projects`} className={`nav-link ${!status ? "font-bold" : ""}`} aria-current={!status ? "page" : undefined}>All ({all.length})</Link>
          {counts.map(([st, n]) => (
            <Link key={st} href={`/${lga}/projects?status=${st}`} className={`nav-link ${status === st ? "font-bold" : ""}`} aria-current={status === st ? "page" : undefined}>
              {statusLabel(st)} ({n})
            </Link>
          ))}
        </nav>
        <ProjectMap points={points} center={[row.lat ?? 4.85, row.lng ?? 6.99]} />
      </section>

      <section>
        <ol className="register">
          {projects.map((p) => (
            <li key={p.id} className="register-row">
              <span className="id">{p.id}</span>
              <Link href={`/${lga}/projects/${p.id}`} className="text-lg">{p.name}</Link>
              <span className="small">
                <StatusMark status={p.status} /> <span className="muted">{p.sponsor} sponsored{p.budgetYear ? `, ${p.budgetYear} budget` : ""}{p.ward ? `, ${p.ward} ward` : ""}. {formatNaira(p.amountNgn)}.</span>
              </span>
              {p.statusNote ? <span className="small">{p.statusNote}</span> : null}
              {p.evidence.length ? <span className="small muted">{p.evidence.length} evidence item{p.evidence.length > 1 ? "s" : ""}</span> : null}
              <SourceStamp compact id={p.id} source={p.source} sourceUrl={p.sourceUrl} lastVerified={p.lastVerified} />
            </li>
          ))}
        </ol>
        {projects.length === 0 ? (
          <p className="muted">{all.length === 0 ? "No projects have been published yet. When the LGA approves its projects register, each project appears here with its status and source." : "No projects with that status."}</p>
        ) : null}
      </section>
    </LgaShell>
  );
}
