import Link from "next/link";
import { notFound } from "next/navigation";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead, NotPublished } from "@/components/LgaPageHead";
import { ProjectMap } from "@/components/ProjectMap";
import { SourceStamp } from "@/components/SourceStamp";
import { formatDate } from "@/lib/format";
import { getLga, listAssets } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Public assets" };

const CONDITION: Record<string, string> = { good: "Good", fair: "Fair", poor: "Poor", unknown: "Unknown" };
const CLS: Record<string, string> = { good: "status-completed", fair: "status-planned", poor: "status-stalled", unknown: "status-unknown" };

export default async function AssetsPage({ params, searchParams }: { params: Promise<{ lga: string }>; searchParams: Promise<{ type?: string }> }) {
  const { lga } = await params;
  const sp = await searchParams;
  const [row, all] = await Promise.all([getLga(lga), listAssets(lga)]);
  if (!row) notFound();
  const types = [...new Set(all.map((a) => a.type))].sort();
  const type = sp.type && types.includes(sp.type) ? sp.type : undefined;
  const assets = type ? all.filter((a) => a.type === type) : all;
  const points = assets.filter((a) => a.lat != null && a.lng != null).map((a) => ({ id: a.id, name: a.name, lat: a.lat!, lng: a.lng!, status: a.condition === "poor" ? "stalled" : a.condition === "good" ? "completed" : "planned", href: `/${lga}/assets#${a.id}` }));
  const cond = (c: string) => all.filter((a) => (a.condition ?? "unknown") === c).length;

  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/assets`}
      hero={
        <LgaPageHead lgaId={lga} title="Public assets" lede="Health centres, schools, boreholes, markets and other public property the council maintains, with their condition at the last inspection.">
          {all.length ? (
            <dl className="fact-strip">
              <div><dt>Assets</dt><dd>{all.length}</dd></div>
              <div><dt>Good condition</dt><dd>{cond("good")}</dd></div>
              <div><dt>Fair</dt><dd>{cond("fair")}</dd></div>
              <div><dt>Poor</dt><dd style={{ color: cond("poor") ? "var(--caution)" : undefined }}>{cond("poor")}</dd></div>
            </dl>
          ) : null}
        </LgaPageHead>
      }
    >
      {all.length === 0 ? (
        <NotPublished what="public assets inventory" name={row.name} />
      ) : (
        <>
          <section className="grid gap-4">
            <nav aria-label="Filter by type" className="chips">
              <Link href={`/${lga}/assets`} scroll={false} className="chip" aria-current={!type ? "page" : undefined}>All <span className="n">{all.length}</span></Link>
              {types.map((t) => (
                <Link key={t} href={`/${lga}/assets?type=${encodeURIComponent(t)}`} scroll={false} className="chip" aria-current={type === t ? "page" : undefined}>{t} <span className="n">{all.filter((a) => a.type === t).length}</span></Link>
              ))}
            </nav>
            {points.length ? <ProjectMap points={points} center={[row.lat ?? 4.85, row.lng ?? 6.99]} /> : null}
          </section>
          <section>
            <ol className="register">
              {assets.map((a) => (
                <li key={a.id} id={a.id} className="register-row" style={{ padding: "1.15rem 0", scrollMarginTop: "1rem" }}>
                  <span className="record-title">{a.name}</span>
                  <span className="small" style={{ color: "var(--ink-2)" }}>
                    <span className={`status ${CLS[a.condition ?? "unknown"]}`}>{CONDITION[a.condition ?? "unknown"]} condition</span>{" "}
                    {[a.type, a.ward ? `${a.ward} ward` : null, a.lastInspected ? `inspected ${formatDate(a.lastInspected)}` : null].filter(Boolean).join(" · ")}
                  </span>
                  {a.notes ? <span className="small">{a.notes}</span> : null}
                  <SourceStamp compact id={a.id} source={a.source} sourceUrl={a.sourceUrl} lastVerified={a.lastVerified} />
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </LgaShell>
  );
}
