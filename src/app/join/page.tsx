import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "For LGA officials" };

export default function JoinPage() {
  return (
    <>
      <SiteHeader back="/join" />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 grid gap-6 measure">
        <h1>For LGA officials</h1>
        <p className="text-lg">Your local government already has a page here. Joining means your staff publish what the LGA does, built and owns, and residents get answers from your records rather than from rumour. It costs nothing and the records stay yours.</p>
        <h2>What joining takes</h2>
        <ol className="list-decimal pl-5 grid gap-2">
          <li><strong>A data owner.</strong> One officer, usually in Planning, Research and Statistics or the Council Secretary&apos;s office, who approves every record before it is public.</li>
          <li><strong>Accounts.</strong> The portal administrator creates an administrator account for your LGA; your administrator then creates editor and viewer accounts for other officers.</li>
          <li><strong>First records.</strong> Start with the service directory (what you do, the documents to bring, the office) and the projects in your current budget. Twenty services and ten projects is a working portal. A published budget page or a Tracka page can be imported from its web address as a draft.</li>
          <li><strong>Verification.</strong> Mark each record with its source and the date you confirmed it. Records without a date are shown as not yet verified, never hidden.</li>
          <li><strong>The queue.</strong> Every question residents ask that your records cannot answer lands in your data-gap queue. Add the record, close the gap. Flagged answers tell you what to fix.</li>
        </ol>
        <h2>What you get</h2>
        <ul className="list-disc pl-5 grid gap-1">
          <li>Answers in English, Pidgin, Hausa, Yoruba and Igbo from your records only, with the source on every answer.</li>
          <li>A ticket for every resident who asks to talk to a person, with alerts by SMS or email.</li>
          <li>A monthly one-page report and a handover pack for a change of administration.</li>
          <li>Open data addresses for your registers, so state and civic platforms reuse your figures instead of guessing them.</li>
          <li>An ask box you can put on your own website with one line.</li>
        </ul>
        <h2>What it does not do</h2>
        <p>It takes no payments, fills no forms, and gives no opinions about officials or contractors. Internal documents you mark as internal never leave the server. Residents&apos; questions are stored without personal details.</p>
        <h2>How to start</h2>
        <p>Write to the portal administrator with the LGA name, the data owner&apos;s name and role, and an official email address for the first account. The address is on the portal&apos;s repository page. States can onboard all their LGAs at once and embed the ask box on the state website.</p>
        <p className="small muted"><Link href="/standard">Read the LGA Record Standard</Link> · <Link href="/">Back to the directory</Link></p>
      </main>
    </>
  );
}
