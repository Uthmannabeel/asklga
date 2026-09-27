import Link from "next/link";
import { notFound } from "next/navigation";
import { getLga } from "@/lib/queries";
import { dict, uiLang } from "@/lib/i18n";
import { SiteHeader } from "./SiteHeader";

export async function LgaShell({ lgaId, children, back }: { lgaId: string; children: React.ReactNode; back?: string }) {
  const lga = await getLga(lgaId);
  if (!lga) notFound();
  const t = dict(await uiLang());
  return (
    <>
      <SiteHeader lga={lga} demo={lga.demo} back={back} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-6 grid gap-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 small muted border-t border-rule grid gap-2">
        <p>
          {lga.name} Local Government Area, {lga.state} {t.home.state}. {t.footer.answersFrom}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={`/${lgaId}/open-data`} className="nav-link">{t.nav.openData}</Link>
          <Link href="/about-answers" className="nav-link">{t.footer.howChecked}</Link>
          <Link href="/privacy" className="nav-link">{t.footer.privacy}</Link>
          <Link href="/admin" className="nav-link">{t.footer.staffWorkspace}</Link>
        </p>
      </footer>
    </>
  );
}
