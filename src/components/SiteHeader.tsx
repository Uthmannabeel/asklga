import Link from "next/link";
import { LANG_NAMES, REVIEWED, UI_LANGS, dict, uiLang, type UiLang } from "@/lib/i18n";
import { talkDict } from "@/lib/talkStrings";
import { Mark } from "./Wordmark";
import { NavLinks } from "./NavLinks";

const NATIONAL = [
  { href: "/", label: "Find your LGA", exact: true },
  { href: "/money", label: "Money" },
  { href: "/compare", label: "Compare" },
  { href: "/issues", label: "Problems reported" },
  { href: "/about-answers", label: "How answers work" },
  { href: "/standard", label: "Open data" },
  { href: "/join", label: "For officials" },
];

// Shown in English on every language: the wording is a factual caveat that should not drift in translation.
const COMPILED_BANNER =
  "Compiled by AskLGA from public sources. Not yet confirmed by the council.";

export async function SiteHeader({ lga, demo, compiled, back }: { lga?: { id: string; name: string; state: string }; demo?: boolean; compiled?: boolean; back?: string }) {
  const lang: UiLang = await uiLang();
  const t = dict(lang);
  const returnTo = back ?? (lga ? `/${lga.id}` : "/");
  const stateLabel = lga ? (lga.state === "Federal Capital Territory" ? lga.state : `${lga.state} State`) : "";
  return (
    <>
      <a href="#main" className="skip-link">{t.skip}</a>
      {demo ? <div className="demo-banner" role="note"><div className="wrap">{t.demoBanner}</div></div> : null}
      {compiled && !demo ? (
        <details className="demo-banner" lang="en">
          <summary className="wrap">Compiled from public sources. Not yet confirmed by the council.<span className="why">Why?</span></summary>
          <p className="wrap">{COMPILED_BANNER}</p>
        </details>
      ) : null}
      {!REVIEWED[lang] ? <div className="demo-banner" role="note" lang="en"><div className="wrap">{t.pendingReview}</div></div> : null}
      <header className="site-header">
        <div className="wrap site-header-row">
          <Link href="/" className="wordmark" aria-label="AskLGA home">
            <Mark />
            <span>AskLGA</span>
          </Link>
          {lga ? (
            <p className="small muted" style={{ minWidth: 0 }}>
              <span aria-hidden="true">/ </span>
              <Link href={`/${lga.id}`} className="text-ink no-underline font-bold">{lga.name}</Link>
              <span className="hidden sm:inline">, {stateLabel}</span>
            </p>
          ) : (
            <NavLinks items={NATIONAL} className="primary-nav" label="Main" />
          )}
          <details className="lang-menu">
            <summary>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 8h13M8 1.5c2 2 2.8 4.2 2.8 6.5S10 12.5 8 14.5M8 1.5C6 3.5 5.2 5.7 5.2 8S6 12.5 8 14.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
              <span className="sr-only">{t.language}: </span>
              <span>{LANG_NAMES[lang]}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
            </summary>
            <ul>
              {UI_LANGS.map((code) => (
                <li key={code}>
                  <a
                    href={`/api/lang?set=${code}&back=${encodeURIComponent(returnTo)}`}
                    aria-current={code === lang ? "true" : undefined}
                    lang={code === "en" ? "en" : code}
                  >
                    {LANG_NAMES[code]}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </header>
      {lga ? (
        <div className="lga-bar">
          <div className="wrap">
            <NavLinks
              className="lga-tabs"
              label="Sections"
              items={[
                { href: `/${lga.id}`, label: t.nav.ask, exact: true },
                { href: `/${lga.id}/talk`, label: talkDict(lang).tab },
                { href: `/${lga.id}/issues`, label: t.nav.issues },
                { href: `/${lga.id}/report-card`, label: t.nav.reportCard },
                { href: `/${lga.id}/services`, label: t.nav.services },
                { href: `/${lga.id}/projects`, label: t.nav.projects },
                { href: `/${lga.id}/assets`, label: t.nav.assets },
                { href: `/${lga.id}/money`, label: t.nav.money },
                { href: `/${lga.id}/investment`, label: t.nav.investment },
                { href: `/${lga.id}/documents`, label: t.nav.documents },
                { href: `/${lga.id}/open-data`, label: t.nav.openData },
              ]}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
