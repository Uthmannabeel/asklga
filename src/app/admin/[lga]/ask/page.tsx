import { AskBox } from "@/components/AskBox";
import { INTERNAL_MODE, PROVIDER } from "@/lib/ask";
import { dict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function InternalAsk({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  return (
    <section className="grid gap-4">
      <h1>Ask the records, including internal documents</h1>
      <p className="measure">
        The public registers plus the LGA&apos;s internal documents. Use it while handling an enquiry or to find a past council decision. Answers cite the record; check the record before you act on it.
      </p>
      {INTERNAL_MODE === "search" ? (
        <div className="stamp measure">
          <div><strong>Search mode</strong></div>
          <div>Internal documents are matched by keyword on this server and quoted directly. They are not sent to the model provider ({PROVIDER}), which keeps to the rule that only public content leaves the country. Set ASKLGA_INTERNAL_SCOPE=model to change this with the partner&apos;s sign-off.</div>
        </div>
      ) : (
        <div className="stamp stamp-caution measure">
          <div><strong>Model mode</strong></div>
          <div>Internal passages are sent to the model provider ({PROVIDER}) to compose answers. The build plan allows this only with written partner sign-off or a Nigerian-hosted model.</div>
        </div>
      )}
      <AskBox lgaId={lga} audience="staff" scope="internal" t={dict("en")} lang="en" />
    </section>
  );
}
