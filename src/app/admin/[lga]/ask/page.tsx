import { AskBox } from "@/components/AskBox";

export const dynamic = "force-dynamic";

export default async function InternalAsk({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  return (
    <section className="grid gap-4">
      <h1>Ask the records, including internal documents</h1>
      <p className="measure">
        Same answer engine as the public portal, with the LGA&apos;s internal documents included. Use it while handling an enquiry, to draft a reply, or to find a past council decision. Answers cite the record; check the record before you act on it.
      </p>
      <AskBox lgaId={lga} audience="staff" scope="internal" />
    </section>
  );
}
