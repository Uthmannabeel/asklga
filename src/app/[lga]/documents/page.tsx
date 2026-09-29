import Link from "next/link";
import { LgaShell } from "@/components/LgaShell";
import { LgaPageHead, NotPublished } from "@/components/LgaPageHead";
import { SourceStamp } from "@/components/SourceStamp";
import { formatDate } from "@/lib/format";
import { getLga, listDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, docs] = await Promise.all([getLga(lga), listDocuments(lga, "public")]);
  const kinds = [...new Set(docs.map((d) => d.kind))];
  return (
    <LgaShell
      lgaId={lga}
      back={`/${lga}/documents`}
      hero={
        <LgaPageHead lgaId={lga} title="Documents" lede="Budgets, council minutes, notices and other documents the council has approved for publication. The answer service quotes from these.">
          {docs.length ? (
            <dl className="fact-strip">
              <div><dt>Documents</dt><dd>{docs.length}</dd></div>
              {kinds.slice(0, 3).map((k) => <div key={k}><dt>{k}</dt><dd>{docs.filter((d) => d.kind === k).length}</dd></div>)}
            </dl>
          ) : null}
        </LgaPageHead>
      }
    >
      {docs.length === 0 ? (
        <NotPublished what="documents" name={row?.name ?? "This council"} />
      ) : (
        <ul className="register">
          {docs.map((d) => (
            <li key={d.id} className="register-row md:grid-cols-[3rem_minmax(0,1fr)] md:gap-x-4" style={{ padding: "1.15rem 0" }}>
              <svg width="36" height="44" viewBox="0 0 36 44" aria-hidden="true" className="hidden md:block">
                <path d="M3 2h20l10 10v30H3z" fill="var(--canvas)" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <path d="M23 2v10h10" fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" />
                <path d="M9 20h18M9 26h18M9 32h12" stroke="var(--rule-strong)" strokeWidth="1.5" />
              </svg>
              <div className="grid gap-1.5">
                <Link href={`/${lga}/documents/${d.id}`} className="record-title">{d.title}</Link>
                <span className="small" style={{ color: "var(--ink-2)" }}>{d.kind} · added {formatDate(d.createdAt)}{d.reviewBy ? ` · review due ${formatDate(d.reviewBy)}` : ""}</span>
                <SourceStamp compact id={d.id} source={d.source} sourceUrl={d.sourceUrl} lastVerified={d.createdAt.toISOString()} dateLabel="added" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </LgaShell>
  );
}
