import Link from "next/link";

export function SiteHeader({ lga, demo }: { lga?: { id: string; name: string; state: string }; demo?: boolean }) {
  return (
    <>
      {demo ? <div className="demo-banner">Demo records. Every entry on this portal is illustrative until the LGA data owner approves real records.</div> : null}
      <header className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Link href="/" className="no-underline text-ink font-bold">AskLGA</Link>
          {lga ? (
            <nav aria-label="Sections" className="flex flex-wrap gap-x-5 gap-y-1 small">
              <Link href={`/${lga.id}`}>Ask</Link>
              <Link href={`/${lga.id}/projects`}>Projects</Link>
              <Link href={`/${lga.id}/assets`}>Public assets</Link>
              <Link href={`/${lga.id}/services`}>Services</Link>
              <Link href={`/${lga.id}/investment`}>Investment</Link>
              <Link href={`/${lga.id}/documents`}>Documents</Link>
              <Link href={`/${lga.id}/open-data`}>Open data</Link>
            </nav>
          ) : null}
          <span className="ml-auto small"><Link href="/admin">Staff workspace</Link></span>
        </div>
      </header>
    </>
  );
}
