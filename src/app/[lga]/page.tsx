import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { AskBox } from "@/components/AskBox";
import { StatusMark } from "@/components/StatusMark";
import { getLga, listProjects, listServices } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  return { title: row ? `${row.name} LGA` : "LGA" };
}

export default async function LgaHome({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, projects, services] = await Promise.all([getLga(lga), listProjects(lga), listServices(lga)]);
  if (!row) notFound();
  const active = projects.filter((p) => p.status === "ongoing" || p.status === "stalled").slice(0, 5);

  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-3">
        <p className="small muted">{row.state} State</p>
        <h1>{row.name}</h1>
        {row.intro ? <p className="measure text-lg">{row.intro}</p> : null}
      </section>

      <section>
        <AskBox lgaId={lga} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <h2>Projects on the ground</h2>
          <ul className="register">
            {active.map((p) => (
              <li key={p.id} className="register-row">
                <Link href={`/${lga}/projects/${p.id}`}>{p.name}</Link>
                <span className="small">
                  <StatusMark status={p.status} /> <span className="muted">{p.ward ?? ""}{p.lastVerified ? `, verified ${p.lastVerified}` : ""}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="small"><Link href={`/${lga}/projects`}>All {projects.length} projects and the map</Link></p>
        </div>
        <div className="grid gap-2">
          <h2>Services</h2>
          <ul className="register">
            {services.slice(0, 6).map((sv) => (
              <li key={sv.id} className="register-row">
                <Link href={`/${lga}/services/${sv.id}`}>{sv.name}</Link>
                <span className="small muted">{sv.office ?? ""}</span>
              </li>
            ))}
          </ul>
          <p className="small"><Link href={`/${lga}/services`}>All {services.length} services</Link></p>
        </div>
      </section>

      <section className="measure grid gap-2">
        <h2>Investing here</h2>
        <p>Land, markets, infrastructure, the approvals you will need and whom to contact, in one verified profile.</p>
        <p className="small"><Link href={`/${lga}/investment`}>Read the investment profile</Link></p>
      </section>
    </LgaShell>
  );
}
