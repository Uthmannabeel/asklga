import Link from "next/link";
import { LgaShell } from "@/components/LgaShell";
import { listDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const docs = await listDocuments(lga, "public");
  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <h1>Public documents</h1>
        <p className="measure">Budgets, council minutes, notices and other documents the LGA has approved for publication. The answer service quotes from these.</p>
      </section>
      <ul className="register">
        {docs.map((d) => (
          <li key={d.id} className="register-row">
            <span className="id">{d.id}</span>
            <Link href={`/${lga}/documents/${d.id}`} className="text-lg">{d.title}</Link>
            <span className="small muted">{d.kind}. Added {d.createdAt.toISOString().slice(0, 10)}{d.reviewBy ? `, review by ${d.reviewBy}` : ""}.</span>
          </li>
        ))}
      </ul>
    </LgaShell>
  );
}
