import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { SourceStamp } from "@/components/SourceStamp";
import { getDocument } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { id } = await params;
  const d = await getDocument(id);
  return { title: d && d.approval === "approved" && d.visibility === "public" ? d.title : "Document" };
}

export default async function DocumentPage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const d = await getDocument(id);
  if (!d || d.lgaId !== lga || d.approval !== "approved" || d.visibility !== "public") notFound();
  return (
    <LgaShell lgaId={lga} hero={<LgaPageHead lgaId={lga} title={d.title} lede={`${d.kind} · added ${formatDate(d.createdAt)}`} extraCrumb={{ href: `/${lga}/documents`, label: "Documents" }} />}>
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <article className="measure grid gap-4" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
          {d.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
        </article>
        <aside className="content-start order-first lg:order-none">
          <SourceStamp id={d.id} source={d.source} sourceUrl={d.sourceUrl} lastVerified={d.createdAt.toISOString()} dateLabel="added" />
        </aside>
      </section>
    </LgaShell>
  );
}
