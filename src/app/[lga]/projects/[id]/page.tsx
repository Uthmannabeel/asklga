import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { ProjectMap } from "@/components/ProjectMap";
import { SourceStamp } from "@/components/SourceStamp";
import { StatusMark, statusLabel } from "@/components/StatusMark";
import { ReportForm } from "@/components/ReportForm";
import { getProject, listPhotoReports, listStatusUpdates } from "@/lib/queries";
import { naira } from "@/lib/money";
import { formatDate } from "@/lib/format";

const httpOnly = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : null);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  return { title: p && p.approval === "approved" ? p.name : "Project" };
}

const NR = <span className="muted">Not recorded</span>;
const NP = <span className="muted">Not published</span>;

export default async function ProjectPage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const p = await getProject(id);
  if (!p || p.lgaId !== lga || p.approval !== "approved") notFound();
  const [updates, reports] = await Promise.all([listStatusUpdates(id), listPhotoReports(id)]);

  return (
    <LgaShell
      lgaId={lga}
      hero={
        <LgaPageHead lgaId={lga} title={p.name} extraCrumb={{ href: `/${lga}/projects`, label: "Projects" }}>
          <div className="flex flex-wrap items-center gap-3">
            <StatusMark status={p.status} />
            {p.statusNote ? <span style={{ color: "var(--ink-2)" }}>{p.statusNote}</span> : null}
          </div>
          <dl className="fact-strip">
            <div><dt>Budgeted</dt><dd className="mono">{p.amountNgn != null ? naira(p.amountNgn) : "Not published"}</dd></div>
            <div><dt>Sponsor</dt><dd>{p.sponsor}</dd></div>
            <div><dt>Ward</dt><dd>{p.ward ?? "Not recorded"}</dd></div>
            <div><dt>Last checked</dt><dd>{p.lastVerified ? formatDate(p.lastVerified) : "Not yet"}</dd></div>
          </dl>
        </LgaPageHead>
      }
    >
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <div className="grid gap-12">
          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>Details</h2>
            <dl className="kv">
              <dt>Type</dt><dd>{p.type}</dd>
              <dt>Budget year</dt><dd>{p.budgetYear ?? NR}</dd>
              <dt>Budget line</dt><dd>{p.budgetLine ?? NP}</dd>
              <dt>Contractor</dt><dd>{p.contractor ?? NP}</dd>
              <dt>Started</dt><dd>{p.startDate ? formatDate(p.startDate) : NR}</dd>
              <dt>Expected completion</dt><dd>{p.expectedCompletion ? formatDate(p.expectedCompletion) : NR}</dd>
            </dl>
          </div>

          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>Evidence from the site</h2>
            {p.evidence.length === 0 && reports.length === 0 ? <p className="muted">No site evidence on file yet. You can add a photo report below.</p> : null}
            <ul className="register">
              {p.evidence.map((e, i) => (
                <li key={i} className="register-row">
                  <span>{e.caption}</span>
                  <span className="small muted">Council evidence, {formatDate(e.date)}{httpOnly(e.url) ? <>, <a href={httpOnly(e.url)!} rel="noopener">view photo</a></> : ", photo not yet uploaded"}</span>
                </li>
              ))}
              {reports.map((r) => (
                <li key={r.id} className="register-row">
                  <span>{r.note}</span>
                  <span className="small muted">Resident report, {formatDate(r.createdAt)}{httpOnly(r.imageUrl) ? <>, <a href={httpOnly(r.imageUrl)!} rel="noopener">view photo</a></> : ""}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>Status history</h2>
            {updates.length === 0 ? <p className="muted">No status changes recorded since the record was created.</p> : (
              <ol className="grid gap-0" style={{ borderLeft: "2px solid var(--rule)", marginLeft: "0.4rem" }}>
                {updates.map((u) => (
                  <li key={u.id} className="grid gap-0.5" style={{ padding: "0.25rem 0 1rem 1.1rem", position: "relative" }}>
                    <span aria-hidden="true" style={{ position: "absolute", left: "-0.42rem", top: "0.55rem", width: "0.7rem", height: "0.7rem", borderRadius: 999, background: "var(--paper)", border: "2px solid var(--civic)" }} />
                    <span className="font-bold">{u.oldStatus ? `${statusLabel(u.oldStatus)} to ` : ""}{statusLabel(u.newStatus)}</span>
                    {u.note ? <span>{u.note}</span> : null}
                    <span className="small muted">{formatDate(u.createdAt)}, by {u.by}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="panel">
            <ReportForm projectId={p.id} />
          </div>
        </div>

        <aside className="grid gap-5 content-start order-first lg:order-none">
          <SourceStamp id={p.id} source={p.source} sourceUrl={p.sourceUrl} lastVerified={p.lastVerified} />
          {p.lat != null && p.lng != null ? (
            <div className="grid gap-2">
              <ProjectMap points={[{ id: p.id, name: p.name, lat: p.lat, lng: p.lng, status: p.status, href: `/${lga}/projects/${p.id}` }]} center={[p.lat, p.lng]} zoom={14} height={240} legend={false} />
              <a className="small" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`} rel="noopener">Open in OpenStreetMap</a>
            </div>
          ) : null}
        </aside>
      </section>
    </LgaShell>
  );
}
