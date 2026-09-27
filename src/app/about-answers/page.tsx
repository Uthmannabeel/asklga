import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "How answers are checked" };

export default function AboutAnswersPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 grid gap-6 measure">
        <h1>How answers are checked</h1>
        <p>
          Every answer on this portal comes from records the local government&apos;s data owner has approved for publication: the projects register, the public assets inventory, the service directory, the investment profile and the document library. The answer service cannot use anything else.
        </p>
        <h2>Five checks before you see an answer</h2>
        <ol className="grid gap-2 list-decimal pl-5">
          <li><strong>Personal details are removed first.</strong> Phone numbers, email addresses, identity numbers and &quot;my name is&quot; phrases are stripped from your question before it is stored or sent anywhere.</li>
          <li><strong>The model sees approved records only.</strong> It receives the LGA&apos;s registers and the passages from approved documents that match your question. Draft records and internal documents are not included.</li>
          <li><strong>Every answer must cite a record.</strong> The answer names the record IDs it relied on. If it cannot cite a real, approved record, it is replaced with &quot;We don&apos;t have that in the approved records yet&quot;.</li>
          <li><strong>Figures are checked against the record.</strong> Any number of four or more digits in the answer must appear in a cited record, otherwise the answer is withheld and the question is logged for the LGA to fill.</li>
          <li><strong>Questions that try to give instructions are refused.</strong> A question asking the service to ignore its records or to state a particular result is not sent to the model at all.</li>
        </ol>
        <h2>What the stamp means</h2>
        <p>
          <strong>Verified</strong> on an answer means it passed all five checks and links to the records it used. On a record page, the stamp shows the source, that the data owner approved it, and the date it was last confirmed. <strong>Not yet verified</strong> means the record is published but no confirmation date is on file yet.
        </p>
        <h2>What the service will not do</h2>
        <p>
          It does not take payments, fill forms, or give legal or medical advice. It gives no opinions about officials, contractors or politics. For a complaint, a dispute or a personal case, use &quot;Talk to a person&quot; and a named officer will follow up.
        </p>
        <h2>If an answer is wrong</h2>
        <p>
          Use &quot;Flag a wrong answer&quot; under the answer. Flags go to the LGA&apos;s data owner, who corrects the record or the retrieval and closes the flag. The LGA&apos;s monthly report counts answers, refusals, flags and gaps closed.
        </p>
        <p className="small muted"><Link href="/">Back to the start</Link></p>
      </main>
    </>
  );
}
