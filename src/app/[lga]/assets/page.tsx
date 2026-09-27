import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { ProjectMap } from "@/components/ProjectMap";
import { SourceStamp } from "@/components/SourceStamp";
import { formatDate } from "@/lib/format";
import { getLga, listAssets } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Public assets" };

const CONDITION: Record<string, string> = { good: "Good", fair: "Fair", poor: "Poor", unknown: "Unknown" };

export default async function AssetsPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, assets] = await Promise.all([getLga(lga), listAssets(lga)]);
  if (!row) notFound();
  const points = assets.filter((a) => a.lat != null && a.lng != null).map((a) => ({ id: a.id, name: a.name, lat: a.lat!, lng: a.lng!, status: a.condition === "poor" ? "stalled" : a.condition === "good" ? "completed" : "planned", href: `/${lga}/assets#${a.id}` }));

  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <h1>Public assets inventory</h1>
        <p className="measure">Health centres, schools, boreholes, markets and other public assets the LGA maintains, with their condition at the last inspection.</p>
      </section>
      {assets.length === 0 ? (
        <p className="muted">No public assets have been published yet. When the LGA approves its inventory, each asset appears here with its condition and source.</p>
      ) : (
        <ProjectMap points={points} center={[row.lat ?? 4.85, row.lng ?? 6.99]} />
      )}
      <section>
        <ol className="register">
          {assets.map((a) => (
            <li key={a.id} id={a.id} className="register-row md:grid-cols-[1fr_18rem] md:gap-4">
              <div className="grid gap-1">
                <span className="id">{a.id}</span>
                <span className="text-lg">{a.name}</span>
                <span className="small">
                  <span className={`status ${a.condition === "good" ? "status-completed" : a.condition === "poor" ? "status-stalled" : "status-planned"}`}>{CONDITION[a.condition ?? "unknown"]} condition</span>
                  <span className="muted"> {a.type}{a.ward ? `, ${a.ward} ward` : ""}{a.lastInspected ? `, inspected ${formatDate(a.lastInspected)}` : ""}</span>
                </span>
                {a.notes ? <span className="small">{a.notes}</span> : null}
              </div>
              <SourceStamp id={a.id} source={a.source} sourceUrl={a.sourceUrl} lastVerified={a.lastVerified} />
            </li>
          ))}
        </ol>
      </section>
    </LgaShell>
  );
}
