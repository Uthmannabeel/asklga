import Link from "next/link";
import { StatusMark } from "@/components/StatusMark";
import { listProjects } from "@/lib/queries";
import { formatNaira } from "@/lib/register";

export const dynamic = "force-dynamic";

export default async function AdminProjects({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const projects = await listProjects(lga, { approvedOnly: false });
  return (
    <section className="grid gap-3">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h1>Projects</h1>
        <Link href={`/admin/${lga}/projects/new`} className="btn btn-sm no-underline">Add a project</Link>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Project</th><th>Status</th><th>Amount</th><th>Approval</th><th>Verified</th></tr></thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="muted">{p.id}</td>
              <td><Link href={`/admin/${lga}/projects/${p.id}`}>{p.name}</Link></td>
              <td><StatusMark status={p.status} /></td>
              <td>{formatNaira(p.amountNgn)}</td>
              <td>{p.approval}</td>
              <td>{p.lastVerified ?? <span style={{ color: "var(--caution)" }}>never</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
