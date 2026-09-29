import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";

export const metadata = {
  title: "For LGA officials",
  description: "How a Nigerian local government joins AskLGA: a data owner, accounts, first records, verification, and a queue of what residents ask. Free, and the records stay the council's.",
};

const STEPS: [string, string][] = [
  ["Name a data owner", "One officer, usually in Planning, Research and Statistics or the Council Secretary's office, approves every record before it is public."],
  ["Get accounts", "The portal administrator creates an administrator account for your council. Your administrator then adds editor and viewer accounts for other officers."],
  ["Publish first records", "Start with the service directory and the projects in the current budget. Twenty services and ten projects make a working portal. A budget page already online can be imported from its web address as a draft."],
  ["Verify", "Mark each record with its source and the date you confirmed it. Records without a date are shown as not yet verified, never hidden."],
  ["Work the queue", "Every question your records cannot answer lands in a data-gap queue. Add the record, close the gap. Flagged answers show what to fix."],
];

const GETS: [string, string][] = [
  ["Answers in five languages", "English, Pidgin, Hausa, Yoruba and Igbo, from your records only, with the source on every answer."],
  ["A ticket for every call-back", "When a resident asks to talk to a person, a named officer gets a ticket, with alerts by SMS or email once configured."],
  ["Monthly report and handover pack", "A one-page monthly report, and a handover pack for a change of administration."],
  ["Open data addresses", "Your registers in JSON and CSV, so state and civic platforms reuse your figures instead of guessing them."],
  ["An ask box for your own site", "One line of code puts the same ask box on the council or state website."],
  ["What people need", "See the questions residents ask that you have not answered yet, ranked by how often they come up."],
];

export default function JoinPage() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <>
      <SiteHeader back="/join" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }]}
          eyebrow="For LGA officials"
          title="Your council already has a page. Make it answer."
          lede="Joining means your staff publish what the council does, builds and owns, and residents get answers from your records instead of rumour. It costs nothing, and the records stay yours."
          aside={<a href="#start" className="btn">How to start</a>}
        />
        <div className="wrap py-12 grid gap-16">
          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="grid gap-2 content-start">
              <h2>What joining takes</h2>
              <p className="lede">Five steps, all done by council staff in the workspace. No software to install.</p>
            </div>
            <ol className="steps-list" style={{ gap: "1.4rem" }}>
              {STEPS.map(([h, p]) => (
                <li key={h}>
                  <div className="grid gap-1" style={{ paddingTop: "0.15rem" }}>
                    <strong>{h}</strong>
                    <span style={{ color: "var(--ink-2)" }}>{p}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-6">
            <h2>What your council gets</h2>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {GETS.map(([h, p]) => (
                <div key={h} className="step">
                  <h3>{h}</h3>
                  <p style={{ color: "var(--ink-2)" }}>{p}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <h2>What it does not do</h2>
            <p className="lede" style={{ color: "var(--ink-2)" }}>It takes no payments, fills no forms, and gives no opinions about officials or contractors. Documents you mark as internal are never sent to the answer service. Residents&apos; questions are stored without personal details.</p>
          </section>

          <section id="start" className="band" style={{ borderRadius: 8, scrollMarginTop: "1rem" }}>
            <div className="grid gap-4 p-8 md:p-12 md:grid-cols-[1.5fr_auto] md:items-end">
              <div className="grid gap-3 measure">
                <h2>How to start</h2>
                <p className="lede">Send the council&apos;s name, the data owner&apos;s name and role, and an official email address for the first account. A state can onboard all its councils at once and put the ask box on the state website.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {email ? <a href={`mailto:${email}?subject=${encodeURIComponent("Joining AskLGA")}`} className="btn btn-on-band">Email the administrator</a> : <Link href="/about#contact" className="btn btn-on-band">Contact the administrator</Link>}
                <Link href="/standard" className="btn btn-ghost-band">Read the standard</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
