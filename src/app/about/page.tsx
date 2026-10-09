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
          lede="AskLGA puts every one of Nigeria's 774 local government areas on one open platform: plain-language answers in five languages, the money each council receives, and the records it publishes, each with its source."
        />
        <div className="wrap py-12 grid gap-14">
          <section className="grid gap-10 lg:grid-cols-3">
            {[
              ["For residents", "Find out how to get a service, what is being built in your ward, and what your council received, in the language you speak. No account, no fee."],
              ["For councils", "Publish services, projects and assets once, answer residents every day, and see what people ask that you have not yet answered. Free and open source."],
              ["For everyone else", "Journalists, researchers, investors and civil society get the same records as open data under CC BY 4.0, through a published standard and a data catalogue."],
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
              <dd>Every LGA has a page from day one, built from national public data: boundaries, census figures and federation allocations. These are shown as published and linked to their source.</dd>
              <dt>Council layer</dt>
              <dd>When a council joins, its data owner approves its own records: services, projects, public assets, documents and an investment profile. Only approved records are public, and only they are used to answer questions. Before a council joins, AskLGA may publish records compiled from its website and dated public reports; each names its source, and the council&apos;s pages say they are not yet confirmed.</dd>
              <dt>Answers</dt>
              <dd>The answer service reads only a council&apos;s published records, cites the record IDs it used, and says so when nothing covers a question. <Link href="/about-answers">How answers are checked</Link></dd>
              <dt>Accuracy</dt>
              <dd>Answers are tested against a fixed set of questions and the results are published on the <Link href="/scoreboard">scoreboard</Link>.</dd>
            </dl>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="grid gap-2 content-start">
              <h2>Governance and funding</h2>
            </div>
            <div className="grid gap-3" style={{ color: "var(--ink-2)" }}>
              <p>AskLGA is a public good, not a business. No council pays to be listed, no resident pays to ask, and there is no advertising. It is meant to be sustained by grants, in-kind public hosting and open-source contribution.</p>
              <p>The software is released under the MIT licence and the records under CC BY 4.0, so any state, agency or developer can run it, audit it or build on it. The record format is published as the <Link href="/standard">LGA Record Standard</Link>.</p>
              <p>Personal data is handled under the Nigeria Data Protection Act 2023. Questions are stored without names or phone numbers. <Link href="/privacy">Privacy</Link></p>
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
