import Link from "next/link";
import { LANG_NAMES, REVIEWED, UI_LANGS, dict, uiLang, type UiLang } from "@/lib/i18n";

export async function SiteHeader({ lga, demo, back }: { lga?: { id: string; name: string; state: string }; demo?: boolean; back?: string }) {
  const lang: UiLang = await uiLang();
  const t = dict(lang);
  const returnTo = back ?? (lga ? `/${lga.id}` : "/");
  return (
    <>
      <a href="#main" className="skip-link">{t.skip}</a>
      {demo ? <div className="demo-banner" role="note">{t.demoBanner}</div> : null}
      {!REVIEWED[lang] ? <div className="demo-banner" role="note" lang="en">{t.pendingReview}</div> : null}
      <header className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-4 py-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Link href="/" className="no-underline text-ink font-bold nav-link">AskLGA</Link>
          {lga ? (
            <nav aria-label="Sections" className="flex flex-wrap gap-x-5 gap-y-0 small">
              <Link href={`/${lga.id}`} className="nav-link">{t.nav.ask}</Link>
              <Link href={`/${lga.id}/projects`} className="nav-link">{t.nav.projects}</Link>
              <Link href={`/${lga.id}/assets`} className="nav-link">{t.nav.assets}</Link>
              <Link href={`/${lga.id}/services`} className="nav-link">{t.nav.services}</Link>
              <Link href={`/${lga.id}/money`} className="nav-link">{t.nav.money}</Link>
              <Link href={`/${lga.id}/investment`} className="nav-link">{t.nav.investment}</Link>
              <Link href={`/${lga.id}/documents`} className="nav-link">{t.nav.documents}</Link>
              <Link href={`/${lga.id}/open-data`} className="nav-link">{t.nav.openData}</Link>
            </nav>
          ) : (
            <nav aria-label="National" className="flex flex-wrap gap-x-5 gap-y-0 small">
              <Link href="/" className="nav-link">Directory</Link>
              <Link href="/scoreboard" className="nav-link">Scoreboard</Link>
              <Link href="/insights" className="nav-link">Insights</Link>
              <Link href="/standard" className="nav-link">Standard</Link>
              <Link href="/join" className="nav-link">Join</Link>
            </nav>
          )}
          <nav aria-label={t.language} className="ml-auto flex flex-wrap gap-x-3 small">
            {UI_LANGS.map((code) => (
              <a
                key={code}
                href={`/api/lang?set=${code}&back=${encodeURIComponent(returnTo)}`}
                className={`nav-link ${code === lang ? "font-bold" : ""}`}
                aria-current={code === lang ? "true" : undefined}
                lang={code === "en" ? "en" : code}
              >
                {LANG_NAMES[code]}
              </a>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
