import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead } from "@/components/LgaPageHead";
import { AskBox } from "@/components/AskBox";
import { SourceStamp } from "@/components/SourceStamp";
import { EnquiryForm } from "@/components/EnquiryForm";
import { dict, uiLang } from "@/lib/i18n";
import { getLga, listProfile } from "@/lib/queries";
import { lgaFacts } from "@/lib/facts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investment profile" };

export default async function InvestmentPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, sections, lang] = await Promise.all([getLga(lga), listProfile(lga), uiLang()]);
  if (!row) notFound();
  const facts = lgaFacts(row);
  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/investment`}
      hero={
        <LgaPageHead lgaId={lga} title={`Investing in ${row.name}`} lede="What an investor needs before a first visit, verified with the council and the state: land, markets, infrastructure, approvals and whom to contact.">
          {facts.length ? (
            <dl className="fact-strip">
              {facts.slice(0, 5).map((f) => <div key={f.key}><dt>{f.label}{f.note ? <span className="muted"> · {f.note}</span> : null}</dt><dd>{f.value}</dd></div>)}
            </dl>
          ) : null}
        </LgaPageHead>
      }
    >
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14 items-start">
        <div className="grid gap-10">
          {sections.length === 0 ? (
            <div className="empty">
              <p className="font-bold">The investment profile has not been published yet</p>
              <p style={{ color: "var(--ink-2)" }}>When the council and the state investment agency approve it, each section appears here with its source. You can still send an enquiry, and it goes to the council.</p>
            </div>
          ) : null}
          {sections.map((sec) => (
            <article key={sec.id} id={sec.id} className="grid gap-3" style={{ scrollMarginTop: "1rem" }}>
              <h2 style={{ fontSize: "1.4rem" }}>{sec.title}</h2>
              <div className="grid gap-3 measure" style={{ color: "var(--ink-2)" }}>{sec.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}</div>
              <SourceStamp compact id={sec.id} source={sec.source} sourceUrl={sec.sourceUrl} lastVerified={sec.lastVerified} />
            </article>
          ))}
        </div>
        <aside className="grid gap-6 content-start lg:sticky lg:top-4">
          {sections.length ? (
            <nav aria-label="On this page" className="grid gap-2">
              <p className="eyebrow">On this page</p>
              <ul className="grid gap-1">{sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ul>
            </nav>
          ) : null}
          <div className="panel">
            <AskBox lgaId={lga} audience="investor" compact t={dict(lang)} lang={lang} />
          </div>
        </aside>
      </section>
      <section className="panel measure" style={{ maxWidth: "48rem" }}>
        <EnquiryForm lgaId={lga} />
      </section>
    </LgaShell>
  );
}
