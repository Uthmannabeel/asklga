import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";

export const metadata = {
  title: "How answers are checked",
  description: "Five checks every AskLGA answer passes before you see it: personal details removed, published records only, a citation on every answer, figures checked, and instruction attacks refused.",
};

const CHECKS: [string, string][] = [
  ["Personal details are removed first", "Phone numbers, email addresses, identity numbers and \"my name is\" phrases are stripped from your question before it is stored or sent anywhere."],
  ["Only published records are used", "The answer service receives the council's published registers and the passages from published public documents that match your question. Drafts and internal documents are not included."],
  ["Every answer must cite a record", "The answer names the record IDs it relied on. If it cannot cite a real, published record, it is replaced with \"We don't have that in the approved records yet\"."],
  ["Figures are checked against the record", "Any number of four or more digits in an answer must appear in a cited record. Otherwise the answer is withheld and the question is logged for the council to fill."],
  ["Instructions hidden in questions are refused", "A question asking the service to ignore its records or to state a particular result is not sent to the model at all."],
];

export default function AboutAnswersPage() {
  return (
    <>
      <SiteHeader back="/about-answers" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }, { href: "/about", label: "About" }]}
          eyebrow="Accountability"
          title="How answers are checked"
          lede="Every answer comes from the records published for a council: services, projects, public assets, the investment profile and public documents. Each record names its source. The answer service cannot use anything else."
        />
        <div className="wrap py-12 grid gap-16">
          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="grid gap-2 content-start">
              <h2>Five checks before you see an answer</h2>
            </div>
            <ol className="steps-list" style={{ gap: "1.4rem" }}>
              {CHECKS.map(([h, p]) => (
                <li key={h}>
                  <div className="grid gap-1" style={{ paddingTop: "0.15rem" }}>
                    <strong>{h}</strong>
                    <span style={{ color: "var(--ink-2)" }}>{p}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <h2>What the stamp means</h2>
            <div className="grid gap-4">
              <figure className="grid gap-2" style={{ maxWidth: "26rem" }}>
                <div className="stamp">
                  <div><span style={{ color: "var(--caution)", fontWeight: 700 }}>Not yet verified</span> Record OBA-S-0003</div>
                  <div>Source: Compiled from public sources: Obio/Akpor council website, revenue schedule (Oct 2026). Not yet confirmed by the council.</div>
                  <div>No verification date on file</div>
                </div>
                <figcaption className="small muted">The stamp on an Obio/Akpor record compiled from the council&apos;s website. When the council confirms it, the stamp reads Verified, with the date.</figcaption>
              </figure>
              <p style={{ color: "var(--ink-2)" }}><strong style={{ color: "var(--ink)" }}>Checked answer</strong> means the answer passed all five checks and links to the records it used. <strong style={{ color: "var(--ink)" }}>Verified</strong> on a record means the council has confirmed it. On a record, the stamp shows the source and, once the council&apos;s data owner has confirmed it, the date it was last confirmed. <strong style={{ color: "var(--ink)" }}>Not yet verified</strong> means the record is published but no confirmation date is on file.</p>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <h2>What the service will not do</h2>
            <p style={{ color: "var(--ink-2)" }}>It does not take payments, fill forms, or give legal or medical advice. It gives no opinions about officials, contractors or politics. For a complaint, a dispute or a personal case, use &quot;Talk to a person&quot; and a named officer will follow up.</p>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <h2>If an answer is wrong</h2>
            <p style={{ color: "var(--ink-2)" }}>Use &quot;Flag a wrong answer&quot; under the answer. Flags go to the council&apos;s data owner, who corrects the record and closes the flag. Measured accuracy for each council is published on the <Link href="/scoreboard">scoreboard</Link>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
