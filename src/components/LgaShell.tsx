import { notFound } from "next/navigation";
import { getLga } from "@/lib/queries";
import { SiteHeader } from "./SiteHeader";

export async function LgaShell({ lgaId, children }: { lgaId: string; children: React.ReactNode }) {
  const lga = await getLga(lgaId);
  if (!lga) notFound();
  return (
    <>
      <SiteHeader lga={lga} demo={lga.demo} />
      <main className="mx-auto max-w-5xl px-4 py-6 grid gap-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 small muted border-t border-rule">
        <p>
          {lga.name} Local Government Area, {lga.state} State. Answers come only from records approved by the LGA data owner. Records are open data; see the Open data page.
        </p>
      </footer>
    </>
  );
}
