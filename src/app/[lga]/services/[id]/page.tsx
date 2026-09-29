import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { SourceStamp } from "@/components/SourceStamp";
import { getService } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { id } = await params;
  const s = await getService(id);
  return { title: s && s.approval === "approved" ? s.name : "Service" };
}

export default async function ServicePage({ params }: { params: Promise<{ lga: string; id: string }> }) {
  const { lga, id } = await params;
  const s = await getService(id);
  if (!s || s.lgaId !== lga || s.approval !== "approved") notFound();
  return (
    <LgaShell lgaId={lga} hero={<LgaPageHead lgaId={lga} title={s.name} lede={s.summary ?? undefined} extraCrumb={{ href: `/${lga}/services`, label: "Services" }} />}>
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <div className="grid gap-10">
          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>Steps</h2>
            {s.steps.length ? <ol className="steps-list">{s.steps.map((d, i) => <li key={i}><span style={{ paddingTop: "0.2rem" }}>{d}</span></li>)}</ol> : <p className="muted">Not recorded.</p>}
          </div>
          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>What to bring</h2>
            {s.documents.length ? (
              <ul className="grid gap-2">
                {s.documents.map((d) => (
                  <li key={d} className="flex gap-3 items-start">
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flex: "none", marginTop: 3 }}><rect x="1.5" y="1.5" width="15" height="15" rx="3" fill="none" stroke="var(--civic)" strokeWidth="1.5" /><path d="M5 9.2 7.8 12 13 6" fill="none" stroke="var(--civic)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            ) : <p>No documents required.</p>}
          </div>
          <div className="grid gap-3">
            <h2 style={{ fontSize: "1.4rem" }}>Details</h2>
            <dl className="kv">
              <dt>Who can use it</dt><dd>{s.eligibility ?? <span className="muted">Not recorded</span>}</dd>
              <dt>Where to go</dt><dd>{s.office ?? <span className="muted">Not recorded</span>}</dd>
              <dt>Responsible officer</dt><dd>{s.role ?? <span className="muted">Not recorded</span>}</dd>
              <dt>Contact</dt><dd>{s.contact ?? <span className="muted">Not recorded</span>}</dd>
              <dt>How long it takes</dt><dd>{s.turnaround ?? <span className="muted">Not recorded</span>}</dd>
            </dl>
          </div>
        </div>
        <aside className="grid gap-5 content-start order-first lg:order-none">
          <SourceStamp id={s.id} source={s.source} sourceUrl={s.sourceUrl} lastVerified={s.lastVerified} />
          <div className="grid gap-2 small">
            <p style={{ color: "var(--ink-2)" }}>Something here out of date, or the office asked for something different?</p>
            <p><Link href={`/${lga}`}>Ask the council, or pass a question to an officer</Link></p>
          </div>
        </aside>
      </section>
    </LgaShell>
  );
}
