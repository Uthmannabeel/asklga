import Link from "next/link";
import { notFound } from "next/navigation";
import { getLga } from "@/lib/queries";
import { dict, uiLang } from "@/lib/i18n";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/** Chrome for every LGA page. `hero` renders full width above the page body. */
export async function LgaShell({ lgaId, children, back, hero }: { lgaId: string; children: React.ReactNode; back?: string; hero?: React.ReactNode }) {
  const lga = await getLga(lgaId);
  if (!lga) notFound();
  const t = dict(await uiLang());
  return (
    <>
      <SiteHeader lga={lga} demo={lga.demo} compiled={lga.compiled} back={back} />
      <main id="main">
        {hero}
        <div className="wrap py-10 grid gap-12">{children}</div>
      </main>
      <SiteFooter
        lead={
          <div className="grid gap-2">
            <p>
              {lga.name} Local Government Area, {lga.state} {t.home.state}. {t.footer.answersFrom}
            </p>
            <p className="flex flex-wrap gap-x-5">
              <Link href={`/${lgaId}/open-data`}>{t.nav.openData}</Link>
              <Link href="/about-answers">{t.footer.howChecked}</Link>
              <Link href="/privacy">{t.footer.privacy}</Link>
              <Link href="/admin">{t.footer.staffWorkspace}</Link>
            </p>
          </div>
        }
      />
    </>
  );
}
