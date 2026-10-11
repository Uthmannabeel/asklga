import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";
import { DATA_SOURCES } from "@/lib/sources";

export const metadata = {
  title: "About AskLGA",
  description: "What AskLGA is, who it is for, how it is governed and funded, and every public data source it uses, with licences.",
};

export default function About() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <>
      <SiteHeader back="/about" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="About"
          title="A public answer service for local government"
          lede="All 774 local government areas on one open platform: answers in five languages, council money and records, with sources."
        />
        <div className="wrap py-12 grid gap-14">
          <section className="grid gap-10 lg:grid-cols-3">
            {[
              ["For residents", "Services, projects and council money, in your language. No account, no fee."],
              ["For councils", "Publish once, answer residents daily, and see what they ask. Free and open source."],
              ["For everyone else", "The same records as open data, under CC BY 4.0."],
            ].map(([h, p]) => (
              <div key={h} className="step">
                <h2 style={{ fontSize: "1.25rem" }}>{h}</h2>
                <p style={{ color: "var(--ink-2)" }}>{p}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="grid gap-2 content-start">
              <h2>How it works</h2>
              <p className="lede">Two layers, kept apart on purpose.</p>
            </div>
            <dl className="kv">
              <dt>National layer</dt>
              <dd>Every LGA gets a page from national data: boundaries, census and FAAC allocations, each linked to its source.</dd>
              <dt>Council layer</dt>
              <dd>A council approves its own records. Only approved records are public and used for answers. Records AskLGA compiles before a council joins are marked unconfirmed.</dd>
              <dt>Answers</dt>
              <dd>Uses only published records, cites them, and says when it doesn&apos;t know. <Link href="/about-answers">How answers are checked</Link></dd>
              <dt>Accuracy</dt>
              <dd>Tested on a fixed question set; results on the <Link href="/scoreboard">scoreboard</Link>.</dd>
            </dl>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="grid gap-2 content-start">
              <h2>Governance and funding</h2>
            </div>
            <div className="grid gap-3" style={{ color: "var(--ink-2)" }}>
              <p>A public good, not a business: no fees, no ads. Sustained by grants, public hosting and open-source contribution.</p>
              <p>Software under MIT; council registers under CC BY 4.0; national datasets under their publishers&apos; terms (below). Format: the <Link href="/standard">LGA Record Standard</Link>.</p>
              <p>Handled under the Nigeria Data Protection Act 2023. <Link href="/privacy">Privacy</Link></p>
            </div>
          </section>

          <section id="sources" className="grid gap-4" style={{ scrollMarginTop: "1rem" }}>
            <h2>Data sources and licences</h2>
            <p className="measure" style={{ color: "var(--ink-2)" }}>Every figure on the national layer comes from one of these. Council records carry their own source on each record.</p>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Data</th><th>Publisher</th><th>Coverage</th><th>Licence</th></tr></thead>
                <tbody>
                  {DATA_SOURCES.map((s) => (
                    <tr key={s.data}>
                      <td><strong>{s.data}</strong></td>
                      <td><a href={s.url} rel="noopener" style={{ fontWeight: 400 }}>{s.publisher}</a></td>
                      <td>{s.coverage}</td>
                      <td>{s.licence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="contact" className="grid gap-3 measure" style={{ scrollMarginTop: "1rem" }}>
            <h2>Contact</h2>
            {email ? <p>Write to <a href={`mailto:${email}`}>{email}</a>. For a question about a specific council, ask it on that council&apos;s page so the answer reaches the right officer.</p> : <p>For a question about a specific council, ask it on that council&apos;s page and choose to pass it to an officer.</p>}
            <p className="small"><Link href="/join">Council officials: how to join</Link></p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
