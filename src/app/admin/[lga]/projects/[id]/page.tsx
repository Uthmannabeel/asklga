import Link from "next/link";
import { notFound } from "next/navigation";
import { Area, Field, Select, SourceFields } from "@/components/Field";
import { StatusMark, statusLabel } from "@/components/StatusMark";
import { getProject, listPhotoReports, listStatusUpdates } from "@/lib/queries";
import { moderateReport, saveProject, updateProjectStatus } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const STATUSES: [string, string][] = [["planned", "Planned"], ["ongoing", "In progress"], ["completed", "Completed"], ["stalled", "Stalled"], ["abandoned", "Abandoned"], ["unknown", "Status unknown"]];
const TYPES: [string, string][] = [["road", "Road"], ["drainage", "Drainage"], ["health", "Health"], ["education", "Education"], ["water", "Water"], ["market", "Market"], ["power", "Power"], ["other", "Other"]];
const SPONSORS: [string, string][] = [["LGA", "LGA"], ["State", "State"], ["Federal", "Federal"], ["NDDC", "NDDC"], ["Constituency", "Constituency"], ["Other", "Other"]];

export default async function AdminProject({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const isNew = id === "new";
  const p = isNew ? null : await getProject(id);
  if (!isNew && (!p || p.lgaId !== lga)) notFound();
  const [updates, reports] = p ? await Promise.all([listStatusUpdates(p.id), listPhotoReports(p.id, false)]) : [[], []];

  return (
    <>
      <section className="grid gap-2">
        <p className="small"><Link href={`/admin/${lga}/projects`}>Projects</Link></p>
        <h1>{p ? p.name : "New project"}</h1>
        {p ? <p><span className="muted small">{p.id}</span> <StatusMark status={p.status} /> <Link href={`/${lga}/projects/${p.id}`} className="small">Public page</Link></p> : null}
      </section>

      {p ? (
        <section className="grid gap-3 border border-rule p-4" style={{ borderRadius: 2, background: "var(--field)" }}>
          <h2>Update status from the field</h2>
          <form action={updateProjectStatus} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={p.id} />
            <Select label="New status" name="status" value={p.status} options={STATUSES} />
            <Field label="What you saw" name="note" placeholder="Asphalt laid on two of four streets" />
            <Field label="Evidence caption" name="evidenceCaption" placeholder="Site photo, north end" hint="Adding a caption records an evidence item and sets last verified to today." />
            <Field label="Evidence photo link" name="evidenceUrl" type="url" />
            <div><button type="submit" className="btn">Record the update</button></div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2>{p ? "Edit the record" : "Record details"}</h2>
        <form action={saveProject} className="grid gap-3">
          <input type="hidden" name="lgaId" value={lga} />
          {p ? <input type="hidden" name="id" value={p.id} /> : null}
          <Field label="Project name" name="name" value={p?.name} required />
          <div className="grid gap-3 md:grid-cols-3">
            <Select label="Type" name="type" value={p?.type} options={TYPES} />
            <Select label="Sponsor" name="sponsor" value={p?.sponsor} options={SPONSORS} />
            <Select label="Status" name="status" value={p?.status ?? "unknown"} options={STATUSES} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Ward" name="ward" value={p?.ward} />
            <Field label="Latitude" name="lat" value={p?.lat} type="number" />
            <Field label="Longitude" name="lng" value={p?.lng} type="number" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Budget year" name="budgetYear" value={p?.budgetYear} type="number" />
            <Field label="Budget line" name="budgetLine" value={p?.budgetLine} />
            <Field label="Amount (naira)" name="amountNgn" value={p?.amountNgn} type="number" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Contractor" name="contractor" value={p?.contractor} />
            <Field label="Start" name="startDate" value={p?.startDate} placeholder="2025-03" />
            <Field label="Expected completion" name="expectedCompletion" value={p?.expectedCompletion} placeholder="2025-12" />
          </div>
          <Area label="Status note" name="statusNote" value={p?.statusNote} rows={2} />
          <SourceFields source={p?.source} sourceUrl={p?.sourceUrl} approval={p?.approval} lastVerified={p?.lastVerified} />
          <div><button type="submit" className="btn">{p ? "Save changes" : "Create project"}</button></div>
        </form>
      </section>

      {p ? (
        <>
          <section className="grid gap-2">
            <h2>Resident reports awaiting a check</h2>
            {reports.filter((r) => r.status === "pending").length === 0 ? <p className="muted">None waiting.</p> : null}
            <ul className="register">
              {reports.filter((r) => r.status === "pending").map((r) => (
                <li key={r.id} className="register-row">
                  <span>{r.note}</span>
                  <span className="small muted">{r.createdAt.toISOString().slice(0, 10)}{r.imageUrl ? <>, <a href={r.imageUrl}>photo</a></> : ""}</span>
                  <form action={moderateReport} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" name="status" value="approved" className="btn btn-sm">Publish as evidence</button>
                    <button type="submit" name="status" value="rejected" className="btn btn-quiet btn-sm">Reject</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-2">
            <h2>Status history</h2>
            <ul className="register">
              {updates.map((u) => (
                <li key={u.id} className="register-row">
                  <span>{u.oldStatus ? `${statusLabel(u.oldStatus)} to ` : ""}{statusLabel(u.newStatus)}{u.note ? `: ${u.note}` : ""}</span>
                  <span className="small muted">{u.createdAt.toISOString().slice(0, 16).replace("T", " ")}, by {u.by}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
