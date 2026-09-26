import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { staffName } from "@/lib/auth";
import { getLga } from "@/lib/queries";

export default async function AdminLgaLayout({ params, children }: { params: Promise<{ lga: string }>; children: React.ReactNode }) {
  const name = await staffName();
  if (!name) redirect("/admin");
  const { lga } = await params;
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
    ["/gaps", "Data gaps"],
    ["/flags", "Flagged answers"],
    ["/tickets", "Tickets"],
    ["/enquiries", "Investor enquiries"],
    ["/report", "Monthly report"],
    ["/handover", "Handover pack"],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <nav aria-label="Workspace sections" className="grid content-start gap-1 small">
        <p className="font-bold">{row.name}</p>
        {items.map(([path, label]) => (
          <Link key={path} href={`/admin/${lga}${path}`}>{label}</Link>
        ))}
        <p className="muted mt-3"><Link href={`/${lga}`}>Public portal</Link></p>
      </nav>
      <div className="grid gap-6 min-w-0">{children}</div>
    </div>
  );
}
