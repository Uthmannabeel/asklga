import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHead } from "@/components/PageHead";

export const metadata = { title: "Privacy", description: "What AskLGA stores when you use it, why, and for how long, under the Nigeria Data Protection Act 2023." };

/**
 * Plain-language notice under the Nigeria Data Protection Act 2023. The operator of each
 * deployment is the data controller; the LGA is named on every portal page.
 */
const SECTIONS: [string, string, React.ReactNode][] = [
  ["questions", "Questions you ask", <>Your question is stored with the answer, the language it was in, and the time. Before it is stored or sent to the answer service, phone numbers, email addresses, identity numbers and &quot;my name is&quot; phrases are removed automatically. Please do not type your name, address or phone number into a question. Council staff can read stored questions so they can add missing records and fix wrong answers. Questions are kept for as long as the council needs them to improve its records, and are exported or deleted on the council&apos;s instruction.</>],
  ["person", "When you ask to talk to a person", <>If you leave a phone number, it is stored with your ticket so a named officer can call you back. It is shown only to council staff in the workspace, never sent to the answer service, and never published. Tickets are closed by the officer and kept in the council&apos;s records.</>],
  ["enquiries", "Investor enquiries and site reports", <>An investor enquiry stores the organisation, sector, summary and contact you provide, for the council&apos;s planning unit to route. A site report on a project stores your note and any photo link you give. It is reviewed by the data owner before it is shown publicly as evidence, and it never shows your identity.</>],
  ["processors", "Who processes the data", <>The local government named on the page is the data controller. The answer service sends the scrubbed question and the council&apos;s approved public records to a model provider to compose the answer; the provider is named in the portal&apos;s technical documentation. Ratings and flags are tied to the answer you received and cannot be altered by anyone else.</>],
  ["cookies", "Cookies", <>No account is needed to use AskLGA, and no advertising or tracking cookies are set. If you choose a language, one cookie remembers it. The staff workspace uses one sign-in cookie that expires after twelve hours.</>],
  ["rights", "Your rights", <>You can ask the council to show you, correct or delete data about you, and you can complain to the Nigeria Data Protection Commission. Send requests to the council secretariat named on the page, or see <Link href="/about#contact">contact</Link>.</>],
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader back="/privacy" />
      <main id="main">
        <PageHead
          crumbs={[{ href: "/", label: "Nigeria" }, { href: "/about", label: "About" }]}
          title="Privacy"
          lede="What AskLGA stores when you use it, why, and for how long. This notice follows the Nigeria Data Protection Act 2023."
        />
        <div className="wrap py-12 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="toc self-start hidden lg:grid">
            <p className="eyebrow">On this page</p>
            {SECTIONS.map(([id, h]) => <a key={id} href={`#${id}`}>{h}</a>)}
          </nav>
          <div className="prose">
            {SECTIONS.map(([id, h, body]) => (
              <section key={id} id={id} className="grid gap-2" style={{ scrollMarginTop: "1rem" }}>
                <h2>{h}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
