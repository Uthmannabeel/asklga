import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { SourceStamp } from "@/components/SourceStamp";
import { getService } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const s = await getService(id);
  if (!s || s.lgaId !== lga || s.approval !== "approved") notFound();
  return (
    <LgaShell lgaId={lga}>
      <section className="grid gap-2">
        <p className="small"><Link href={`/${lga}/services`}>Service directory</Link></p>
        <span className="id small muted">{s.id}</span>
        <h1>{s.name}</h1>
        {s.summary ? <p className="measure text-lg">{s.summary}</p> : null}
      </section>
      <section className="grid gap-6 md:grid-cols-[1fr_20rem]">
        <div className="grid gap-6 measure">
          <div className="grid gap-1">
            <h2>Who can use it</h2>
            <p>{s.eligibility ?? "Not recorded."}</p>
          </div>
          <div className="grid gap-1">
            <h2>What to bring</h2>
            {s.documents.length ? <ul className="list-disc pl-5">{s.documents.map((d) => <li key={d}>{d}</li>)}</ul> : <p>No documents required.</p>}
          </div>
          <div className="grid gap-1">
            <h2>Steps</h2>
            {s.steps.length ? <ol className="list-decimal pl-5 grid gap-1">{s.steps.map((d) => <li key={d}>{d}</li>)}</ol> : <p>Not recorded.</p>}
          </div>
          <table>
            <tbody>
              <tr><th>Office</th><td>{s.office ?? "Not recorded"}</td></tr>
              <tr><th>Responsible</th><td>{s.role ?? "Not recorded"}</td></tr>
              <tr><th>Contact</th><td>{s.contact ?? "Not recorded"}</td></tr>
              <tr><th>How long it takes</th><td>{s.turnaround ?? "Not recorded"}</td></tr>
            </tbody>
          </table>
        </div>
        <aside className="content-start order-first md:order-none">
          <SourceStamp id={s.id} source={s.source} sourceUrl={s.sourceUrl} lastVerified={s.lastVerified} />
        </aside>
      </section>
    </LgaShell>
  );
}
