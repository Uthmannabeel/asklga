import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { SourceStamp } from "@/components/SourceStamp";
import { getDocument } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const d = await getDocument(id);
  if (!d || d.lgaId !== lga || d.approval !== "approved" || d.visibility !== "public") notFound();
  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <p className="small"><Link href={`/${lga}/documents`}>Public documents</Link></p>
        <span className="id small muted">{d.id}</span>
        <h1>{d.title}</h1>
      </section>
      <section className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="measure grid gap-3">{d.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}</div>
        <aside className="content-start"><SourceStamp id={d.id} source={d.source} sourceUrl={d.sourceUrl} lastVerified={d.reviewBy ? d.createdAt.toISOString().slice(0, 10) : null} /></aside>
      </section>
    </LgaShell>
  );
}
