import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canAccessLga, currentStaff } from "@/lib/auth";
import { getLga } from "@/lib/queries";

export default async function AdminLgaLayout({ params, children }: { params: Promise<{ lga: string }>; children: React.ReactNode }) {
  const session = await currentStaff();
  if (!session) redirect("/admin");
  const { lga } = await params;
  if (!canAccessLga(session, lga)) redirect("/admin?error=lga");
  const row = await getLga(lga);
  if (!row) notFound();
  const items: [string, string][] = [
    ["", "Overview"],
    ["/ask", "Ask (internal)"],
    ["/projects", "Projects"],
    ["/assets", "Assets"],
    ["/services", "Services"],
    ["/investment", "Investment profile"],
    ["/documents", "Documents"],
    ["/officials", "Officials"],
    ["/issues", "Problems reported"],
    ["/gaps", "Data gaps"],
    ["/flags", "Flagged answers"],
    ["/tickets", "Tickets"],
    ["/enquiries", "Investor enquiries"],
    ["/report", "Monthly report"],
    ["/handover", "Handover pack"],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <nav aria-label="Workspace sections" className="grid content-start gap-0 small">
        <p className="font-bold">{row.name}</p>
        {session.role === "viewer" ? <p className="muted small">Read-only account</p> : null}
        {items.map(([path, label]) => (
          <Link key={path} href={`/admin/${lga}${path}`} className="nav-link">{label}</Link>
        ))}
        <p className="muted mt-3"><Link href={`/${lga}`} className="nav-link">Public portal</Link></p>
      </nav>
      <div className="grid gap-6 min-w-0">{children}</div>
    </div>
  );
}
