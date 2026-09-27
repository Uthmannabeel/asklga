import { notFound } from "next/navigation";
import { AskBox } from "@/components/AskBox";
import { EmbedHeight } from "@/components/EmbedHeight";
import { getLga } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Minimal page loaded inside the widget iframe. */
export default async function EmbedPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  if (!row) notFound();
  return (
    <main className="p-3 grid gap-2">
      <EmbedHeight />
      <p className="small muted">Ask {row.name} LGA{row.demo ? " (demo records)" : ""}</p>
      <AskBox lgaId={lga} compact />
    </main>
  );
}
