import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { ProjectMap } from "@/components/ProjectMap";
import { SourceStamp } from "@/components/SourceStamp";
import { StatusMark, statusLabel } from "@/components/StatusMark";
import { ReportForm } from "@/components/ReportForm";
import { getProject, listPhotoReports, listStatusUpdates } from "@/lib/queries";
import { formatNaira } from "@/lib/register";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const p = await getProject(id);
  if (!p || p.lgaId !== lga || p.approval !== "approved") notFound();
  const [updates, reports] = await Promise.all([listStatusUpdates(id), listPhotoReports(id)]);

  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <p className="small"><Link href={`/${lga}/projects`}>Projects register</Link></p>
        <span className="id small muted">{p.id}</span>
        <h1>{p.name}</h1>
        <p><StatusMark status={p.status} />{p.statusNote ? <span className="ml-2">{p.statusNote}</span> : null}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          <table>
            <tbody>
              <tr><th>Type</th><td>{p.type}</td></tr>
              <tr><th>Ward</th><td>{p.ward ?? "Not recorded"}</td></tr>
              <tr><th>Sponsor</th><td>{p.sponsor}</td></tr>
              <tr><th>Budget year</th><td>{p.budgetYear ?? "Not recorded"}</td></tr>
              <tr><th>Budget line</th><td>{p.budgetLine ?? "Not published"}</td></tr>
              <tr><th>Amount</th><td>{formatNaira(p.amountNgn)}</td></tr>
              <tr><th>Contractor</th><td>{p.contractor ?? "Not published"}</td></tr>
              <tr><th>Start</th><td>{p.startDate ?? "Not recorded"}</td></tr>
              <tr><th>Expected completion</th><td>{p.expectedCompletion ?? "Not recorded"}</td></tr>
            </tbody>
          </table>

          <div className="grid gap-2">
            <h2>Evidence</h2>
            {p.evidence.length === 0 && reports.length === 0 ? <p className="muted">No site evidence on file yet.</p> : null}
            <ul className="register">
              {p.evidence.map((e, i) => (
                <li key={i} className="register-row">
                  <span>{e.caption}</span>
                  <span className="small muted">{e.date}{e.url ? <>, <a href={e.url}>photo</a></> : ", photo not yet uploaded"}</span>
                </li>
              ))}
              {reports.map((r) => (
                <li key={r.id} className="register-row">
                  <span>{r.note}</span>
                  <span className="small muted">Resident report, {r.createdAt.toISOString().slice(0, 10)}{r.imageUrl ? <>, <a href={r.imageUrl}>photo</a></> : ""}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2">
            <h2>Status history</h2>
            {updates.length === 0 ? <p className="muted">No status changes recorded since the record was created.</p> : null}
            <ul className="register">
              {updates.map((u) => (
                <li key={u.id} className="register-row">
                  <span>{u.oldStatus ? `${statusLabel(u.oldStatus)} to ` : ""}{statusLabel(u.newStatus)}{u.note ? `: ${u.note}` : ""}</span>
                  <span className="small muted">{u.createdAt.toISOString().slice(0, 10)}, by {u.by}</span>
                </li>
              ))}
            </ul>
          </div>

          <ReportForm projectId={p.id} />
        </div>

        <aside className="grid gap-4 content-start">
          <SourceStamp id={p.id} source={p.source} sourceUrl={p.sourceUrl} lastVerified={p.lastVerified} />
          {p.lat != null && p.lng != null ? (
            <ProjectMap points={[{ id: p.id, name: p.name, lat: p.lat, lng: p.lng, status: p.status, href: `/${lga}/projects/${p.id}` }]} center={[p.lat, p.lng]} zoom={14} height={240} />
          ) : null}
        </aside>
      </section>
    </LgaShell>
  );
}
