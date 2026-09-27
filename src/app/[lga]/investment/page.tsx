import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { AskBox } from "@/components/AskBox";
import { SourceStamp } from "@/components/SourceStamp";
import { EnquiryForm } from "@/components/EnquiryForm";
import { dict, uiLang } from "@/lib/i18n";
import { getLga, listProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investment profile" };

export default async function InvestmentPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, sections, lang] = await Promise.all([getLga(lga), listProfile(lga), uiLang()]);
  if (!row) notFound();
  return (
    <LgaShell lgaId={lga} back={`/${lga}/investment`}>
      <section className="grid gap-2">
        <h1>Investing in {row.name}</h1>
        <p className="measure text-lg">What an investor needs before a first visit, verified with the LGA and the state. Ask a question below or read the profile.</p>
      </section>
      <AskBox lgaId={lga} audience="investor" compact t={dict(lang)} lang={lang} />
      <section className="grid gap-8">
        {sections.length === 0 ? <p className="muted">The investment profile has not been published yet. When the LGA and the state investment agency approve it, each section appears here with its source.</p> : null}
        {sections.map((sec) => (
          <article key={sec.id} id={sec.id} className="grid gap-3 md:grid-cols-[1fr_20rem] md:gap-6">
            <div className="grid gap-2 measure">
              <h2>{sec.title}</h2>
              {sec.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
            <aside className="content-start"><SourceStamp compact id={sec.id} source={sec.source} sourceUrl={sec.sourceUrl} lastVerified={sec.lastVerified} /></aside>
          </article>
        ))}
      </section>
      <EnquiryForm lgaId={lga} />
    </LgaShell>
  );
}
