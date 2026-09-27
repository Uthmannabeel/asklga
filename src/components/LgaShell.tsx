import Link from "next/link";
import { notFound } from "next/navigation";
import { getLga } from "@/lib/queries";
import { SiteHeader } from "./SiteHeader";

export async function LgaShell({ lgaId, children }: { lgaId: string; children: React.ReactNode }) {
  const lga = await getLga(lgaId);
  if (!lga) notFound();
  return (
    <>
      <SiteHeader lga={lga} demo={lga.demo} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-6 grid gap-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 small muted border-t border-rule grid gap-2">
        <p>
          {lga.name} Local Government Area, {lga.state} State. Answers come only from records approved by the LGA data owner. Records are open data under CC BY 4.0; see the <Link href={`/${lgaId}/open-data`}>Open data</Link> page.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/about-answers" className="nav-link">How answers are checked</Link>
          <Link href="/privacy" className="nav-link">Privacy</Link>
          <Link href="/admin" className="nav-link">Staff workspace</Link>
        </p>
      </footer>
    </>
  );
}
