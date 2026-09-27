import Link from "next/link";

export function SiteHeader({ lga, demo }: { lga?: { id: string; name: string; state: string }; demo?: boolean }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      {demo ? <div className="demo-banner" role="note">Demo records. Every entry on this portal is illustrative until the LGA data owner approves real records.</div> : null}
      <header className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-4 py-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Link href="/" className="no-underline text-ink font-bold nav-link">AskLGA</Link>
          {lga ? (
            <nav aria-label="Sections" className="flex flex-wrap gap-x-5 gap-y-0 small">
              <Link href={`/${lga.id}`} className="nav-link">Ask</Link>
              <Link href={`/${lga.id}/projects`} className="nav-link">Projects</Link>
              <Link href={`/${lga.id}/assets`} className="nav-link">Public assets</Link>
              <Link href={`/${lga.id}/services`} className="nav-link">Services</Link>
              <Link href={`/${lga.id}/investment`} className="nav-link">Investment</Link>
              <Link href={`/${lga.id}/documents`} className="nav-link">Documents</Link>
              <Link href={`/${lga.id}/open-data`} className="nav-link">Open data</Link>
            </nav>
          ) : null}
        </div>
      </header>
    </>
  );
}
