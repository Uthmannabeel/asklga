import Link from "next/link";
import { LgaShell } from "@/components/LgaShell";
import { SourceStamp } from "@/components/SourceStamp";
import { formatDate } from "@/lib/format";
import { listDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const docs = await listDocuments(lga, "public");
  return (
    <LgaShell lgaId={lga} back={`/${lga}/documents`}>
      <section className="grid gap-2">
        <h1>Public documents</h1>
        <p className="measure">Budgets, council minutes, notices and other documents the LGA has approved for publication. The answer service quotes from these.</p>
      </section>
      {docs.length === 0 ? (
        <p className="muted">No documents have been published yet. When the LGA approves a budget, minutes or a notice, it appears here.</p>
      ) : (
        <ul className="register">
          {docs.map((d) => (
            <li key={d.id} className="register-row">
              <span className="id">{d.id}</span>
              <Link href={`/${lga}/documents/${d.id}`} className="text-lg">{d.title}</Link>
              <span className="small muted">{d.kind}. Added {formatDate(d.createdAt)}{d.reviewBy ? `, review due ${formatDate(d.reviewBy)}` : ""}.</span>
              <SourceStamp compact id={d.id} source={d.source} sourceUrl={d.sourceUrl} lastVerified={d.createdAt.toISOString()} dateLabel="added" />
            </li>
          ))}
        </ul>
      )}
    </LgaShell>
  );
}
