import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Privacy" };

/**
 * Plain-language notice under the Nigeria Data Protection Act 2023. The operator of each
 * deployment is the data controller; the LGA is named on every portal page.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 grid gap-6 measure">
        <h1>Privacy</h1>
        <p>This notice explains what the portal stores when you use it, why, and for how long. It follows the Nigeria Data Protection Act 2023.</p>
        <h2>Questions you ask</h2>
        <p>
          Your question is stored with the answer, the language it was in, and the time. Before it is stored or sent to the answer service, phone numbers, email addresses, identity numbers and &quot;my name is&quot; phrases are removed automatically. Please do not type your name, address or phone number into a question. LGA staff can read stored questions so they can add missing records and fix wrong answers. Questions are kept for as long as the LGA needs them to improve its records, and are exported or deleted on the LGA&apos;s instruction.
        </p>
        <h2>When you ask to talk to a person</h2>
        <p>
          If you leave a phone number, it is stored with your ticket so a named officer can call you back. It is shown only to LGA staff in the workspace, it is never sent to the answer service, and it is not published anywhere. Tickets are closed by the officer and kept in the LGA&apos;s records.
        </p>
        <h2>Investor enquiries and site reports</h2>
        <p>
          An investor enquiry stores the organisation, sector, summary and contact you provide, for the LGA&apos;s planning unit to route. A site report on a project stores your note and any photo link you give; it is reviewed by the data owner before it is shown publicly as evidence, and it never shows your identity.
        </p>
        <h2>Who processes the data</h2>
        <p>
          The local government named on the portal is the data controller. The portal&apos;s answer service sends the scrubbed question and the LGA&apos;s approved public records to a model provider to compose the answer; the provider is named in the portal&apos;s technical documentation. Ratings and flags are tied to the answer you received and cannot be altered by anyone else.
        </p>
        <h2>What is not collected</h2>
        <p>
          No account is needed to use the portal. No advertising or tracking cookies are set. The staff workspace uses one sign-in cookie that expires after twelve hours.
        </p>
        <h2>Your rights</h2>
        <p>
          You can ask the LGA to show you, correct or delete data about you, and you can complain to the Nigeria Data Protection Commission. Send requests to the LGA secretariat named on the portal.
        </p>
        <p className="small muted"><Link href="/">Back to the start</Link></p>
      </main>
    </>
  );
}
