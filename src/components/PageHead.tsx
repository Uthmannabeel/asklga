import Link from "next/link";

/** The header band every inner page shares: breadcrumbs, title, one-line purpose, key figures. */
export function PageHead({
  crumbs = [],
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  crumbs?: { href: string; label: string }[];
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-head">
      <div className="wrap py-10 grid gap-6">
        <div className={`grid gap-8 ${aside ? "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" : ""}`}>
          <div className="grid gap-3">
            {crumbs.length ? (
              <nav aria-label="Breadcrumb" className="crumbs">
                {crumbs.map((c, i) => (
                  <span key={c.href}>
                    <Link href={c.href}>{c.label}</Link>
                    {i < crumbs.length - 1 ? <span aria-hidden="true"> / </span> : null}
                  </span>
                ))}
              </nav>
            ) : null}
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {lede ? <p className="lede measure">{lede}</p> : null}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}
