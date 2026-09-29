import Link from "next/link";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead, NotPublished } from "@/components/LgaPageHead";
import { SourceStamp } from "@/components/SourceStamp";
import { getLga, listServices } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default async function ServicesPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, services] = await Promise.all([getLga(lga), listServices(lga)]);
  const categories = [...new Set(services.map((s) => s.category))];
  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/services`}
      hero={
        <LgaPageHead lgaId={lga} title="Services" lede="What the council does for residents and businesses: who can apply, what to bring, which office to visit and how long it takes.">
          {services.length ? (
            <dl className="fact-strip">
              <div><dt>Services published</dt><dd>{services.length}</dd></div>
              <div><dt>Categories</dt><dd>{categories.length}</dd></div>
              <div><dt>Verified in the last 90 days</dt><dd>{services.filter((s) => s.lastVerified && Date.now() - new Date(s.lastVerified).getTime() < 90 * 864e5).length}</dd></div>
            </dl>
          ) : null}
        </LgaPageHead>
      }
    >
      {services.length === 0 ? (
        <NotPublished what="service directory" name={row?.name ?? "This council"} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Categories" className="lg:sticky lg:top-4 self-start">
            <p className="eyebrow mb-2">Categories</p>
            <ul className="chips lg:grid lg:gap-1">
              {categories.map((c) => (
                <li key={c}><a href={`#${slug(c)}`} className="chip lg:!rounded-md lg:w-full lg:justify-between">{c}<span className="n">{services.filter((s) => s.category === c).length}</span></a></li>
              ))}
            </ul>
          </nav>
          <div className="grid gap-12">
            {categories.map((cat) => (
              <section key={cat} id={slug(cat)} className="grid gap-2" style={{ scrollMarginTop: "1rem" }}>
                <h2 style={{ fontSize: "1.4rem" }}>{cat}</h2>
                <ul className="register">
                  {services.filter((s) => s.category === cat).map((s) => (
                    <li key={s.id} className="register-row" style={{ gap: "0.35rem" }}>
                      <Link href={`/${lga}/services/${s.id}`} className="record-title">{s.name}</Link>
                      {s.summary ? <span style={{ color: "var(--ink-2)" }}>{s.summary}</span> : null}
                      {s.office || s.turnaround ? (
                        <span className="small" style={{ color: "var(--ink-2)" }}>
                          {s.office ? <><span className="muted">Where:</span> {s.office}</> : null}
                          {s.office && s.turnaround ? <span aria-hidden="true"> · </span> : null}
                          {s.turnaround ? <><span className="muted">Takes:</span> {s.turnaround}</> : null}
                        </span>
                      ) : null}
                      <SourceStamp compact id={s.id} source={s.source} sourceUrl={s.sourceUrl} lastVerified={s.lastVerified} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </LgaShell>
  );
}
